import { describe, expect, it } from 'vitest';
import { DAYS, generateTimetable, type ScheduleInput, type Session, type Timetable } from '../scheduler';
import type { Faculty, Room, Section, Subject } from '../types';

const faculty = (overrides: Partial<Faculty> = {}): Faculty => ({
  id: 1,
  name: 'Alex Teacher',
  email: 'alex@example.edu',
  department: 'CS',
  available: true,
  ...overrides,
});

const room = (overrides: Partial<Room> = {}): Room => ({
  id: 1,
  name: 'Room 1',
  building: 'Main',
  type: 'Classroom',
  capacity: 40,
  available: true,
  ...overrides,
});

const section = (overrides: Partial<Section> = {}): Section => ({
  id: 1,
  name: 'Section A',
  department: 'CS',
  semester: 1,
  students: 20,
  shift: 'Shift 1',
  ...overrides,
});

const subject = (overrides: Partial<Subject> = {}): Subject => ({
  id: 1,
  code: 'CS101',
  name: 'Programming',
  department: 'CS',
  semester: 1,
  credits: 3,
  weeklyHours: 1,
  ...overrides,
});

const input = (overrides: Partial<ScheduleInput> = {}): ScheduleInput => ({
  faculty: [faculty()],
  rooms: [room()],
  sections: [section()],
  subjects: [subject()],
  days: 1,
  seed: 41021,
  restarts: 1,
  ...overrides,
});

const stableSessions = (timetable: Timetable) => timetable.sessions.map((s) => ({
  day: s.day,
  start: s.start,
  duration: s.duration,
  section: s.section,
  subjectCode: s.subjectCode,
  facultyEmail: s.facultyEmail,
  room: s.room,
  isLab: s.isLab,
}));

const dayHours = (sessions: readonly Session[], sectionName: string, day: string) =>
  sessions.filter((s) => s.section === sectionName && s.day === day)
    .reduce((total, s) => total + s.duration, 0);

const facultyDayHours = (sessions: readonly Session[], email: string, day: string) =>
  sessions.filter((s) => s.facultyEmail.trim().toLowerCase() === email.toLowerCase() && s.day === day)
    .reduce((total, s) => total + s.duration, 0);

const longestRun = (sessions: readonly Session[], matches: (s: Session) => boolean) => {
  const hours = [...new Set(sessions.filter(matches).flatMap((s) =>
    Array.from({ length: s.duration }, (_, offset) => s.start + offset),
  ))].sort((a, b) => a - b);
  let best = 0;
  let current = 0;
  let previous: number | undefined;
  for (const hour of hours) {
    current = previous === hour - 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = hour;
  }
  return best;
};

const scheduledSubject = (timetable: Timetable, code: string) =>
  timetable.sessions.filter((s) => s.subjectCode === code);

describe('generateTimetable teaching-pattern integration', () => {
  it('keeps section daily hours within the configured limit', () => {
    const timetable = generateTimetable(input({
      subjects: [subject({ weeklyHours: 2 })],
      patternRules: { sectionMaxDailyHours: 1 },
    }));

    expect(dayHours(timetable.sessions, 'Section A', 'Monday')).toBe(1);
    expect(timetable.unscheduled.some((u) => u.reason.includes('Teaching-pattern rule sectionMaxDailyHours'))).toBe(true);
  });

  it('keeps faculty daily hours within the limit across multiple sections', () => {
    const timetable = generateTimetable(input({
      sections: [section(), section({ id: 2, name: 'Section B' })],
      subjects: [subject({ weeklyHours: 2 })],
      patternRules: { facultyMaxDailyHours: 3 },
    }));

    expect(facultyDayHours(timetable.sessions, 'alex@example.edu', 'Monday')).toBe(3);
    expect(timetable.unscheduled.length).toBeGreaterThan(0);
    expect(timetable.sessions.every((s) => s.facultyEmail === 'alex@example.edu')).toBe(true);
  });

  it('limits consecutive section hours across different subjects', () => {
    const timetable = generateTimetable(input({
      days: 1,
      rooms: [room(), room({ id: 2, name: 'Lab 1', type: 'Laboratory' })],
      subjects: [
        subject({ id: 1, code: 'CSL201', name: 'Programming Lab', weeklyHours: 2 }),
        subject({ id: 2, code: 'CS102', name: 'Data Structures', weeklyHours: 1 }),
      ],
      patternRules: { sectionMaxConsecutiveHours: 2 },
      previous: [
        { id: 'old-lab', day: 'Monday', start: 8, duration: 2, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CSL201', subjectName: 'Programming Lab', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Lab 1', isLab: true, color: 0 },
        { id: 'old-class', day: 'Monday', start: 10, duration: 1, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CS102', subjectName: 'Data Structures', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Room 1', isLab: false, color: 0 },
      ],
    }));

    expect(scheduledSubject(timetable, 'CSL201')).toHaveLength(1);
    expect(scheduledSubject(timetable, 'CS102')).toHaveLength(1);
    expect(scheduledSubject(timetable, 'CS102')[0].start).not.toBe(10);
    expect(longestRun(timetable.sessions, (s) => s.section === 'Section A' && s.day === 'Monday')).toBeLessThanOrEqual(2);
  });

  it('limits consecutive faculty hours across different sections', () => {
    const timetable = generateTimetable(input({
      days: 1,
      rooms: [room(), room({ id: 2, name: 'Lab 1', type: 'Laboratory' })],
      sections: [section(), section({ id: 2, name: 'Section B', department: 'Math' })],
      subjects: [
        subject({ id: 1, code: 'CSL201', name: 'Programming Lab', weeklyHours: 2 }),
        subject({ id: 2, code: 'MA101', name: 'Calculus', department: 'Math', weeklyHours: 1 }),
      ],
      patternRules: { facultyMaxConsecutiveHours: 2 },
      previous: [
        { id: 'old-lab', day: 'Monday', start: 8, duration: 2, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CSL201', subjectName: 'Programming Lab', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Lab 1', isLab: true, color: 0 },
        { id: 'old-class', day: 'Monday', start: 10, duration: 1, section: 'Section B', shift: 'Shift 1', department: 'Math', subjectCode: 'MA101', subjectName: 'Calculus', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Room 1', isLab: false, color: 0 },
      ],
    }));

    expect(timetable.sessions).toHaveLength(2);
    expect(scheduledSubject(timetable, 'MA101')[0].start).not.toBe(10);
    expect(new Set(timetable.sessions.map((s) => s.section)).size).toBe(2);
    expect(longestRun(timetable.sessions, (s) => s.facultyEmail === 'alex@example.edu' && s.day === 'Monday')).toBeLessThanOrEqual(2);
  });

  it('counts a two-hour lab as two hours for daily and consecutive limits', () => {
    const lab = subject({ id: 2, code: 'CSL201', name: 'Programming Lab', weeklyHours: 2 });
    const rooms = [room(), room({ id: 2, name: 'Lab 1', type: 'Laboratory' })];
    const accepted = generateTimetable(input({
      rooms,
      subjects: [lab],
      patternRules: { sectionMaxDailyHours: 2, sectionMaxConsecutiveHours: 2 },
    }));
    expect(accepted.sessions).toHaveLength(1);
    expect(accepted.sessions[0]).toMatchObject({ duration: 2, isLab: true });

    const dailyBlocked = generateTimetable(input({ rooms, subjects: [lab], patternRules: { sectionMaxDailyHours: 1 } }));
    expect(scheduledSubject(dailyBlocked, 'CSL201')).toHaveLength(0);
    expect(dailyBlocked.unscheduled.some((u) => u.reason.includes('Teaching-pattern rule sectionMaxDailyHours'))).toBe(true);

    const consecutiveBlocked = generateTimetable(input({ rooms, subjects: [lab], patternRules: { sectionMaxConsecutiveHours: 1 } }));
    expect(scheduledSubject(consecutiveBlocked, 'CSL201')).toHaveLength(0);
    expect(consecutiveBlocked.unscheduled.some((u) => u.reason.includes('Teaching-pattern rule sectionMaxConsecutiveHours'))).toBe(true);
  });

  it('places repeated subject meetings with the required weekly spacing', () => {
    const timetable = generateTimetable(input({
      days: 6,
      subjects: [subject({ weeklyHours: 2 })],
      patternRules: { minSubjectGapDays: 1 },
    }));

    const meetings = scheduledSubject(timetable, 'CS101');
    expect(meetings).toHaveLength(2);
    const indexes = meetings.map((s) => DAYS.indexOf(s.day)).sort((a, b) => a - b);
    const gaps = [indexes[1] - indexes[0] - 1, 6 - indexes[1] - 1 + indexes[0]];
    expect(gaps.every((gap) => gap >= 1)).toBe(true);
  });

  it('enforces spacing across the weekly Saturday-to-Monday wraparound', () => {
    const timetable = generateTimetable(input({
      days: 6,
      subjects: [subject({ weeklyHours: 2 })],
      patternRules: { minSubjectGapDays: 1 },
      previous: [
        { id: 'old-mon', day: 'Monday', start: 8, duration: 1, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CS101', subjectName: 'Programming', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Room 1', isLab: false, color: 0 },
        { id: 'old-sat', day: 'Saturday', start: 8, duration: 1, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CS101', subjectName: 'Programming', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Room 1', isLab: false, color: 0 },
      ],
    }));

    const meetings = scheduledSubject(timetable, 'CS101');
    expect(meetings).toHaveLength(2);
    const indexes = meetings.map((s) => DAYS.indexOf(s.day)).sort((a, b) => a - b);
    expect(6 - indexes[1] - 1 + indexes[0]).toBeGreaterThanOrEqual(1);
  });

  it('finds an alternative placement when a preferred candidate violates a pattern rule', () => {
    const timetable = generateTimetable(input({
      days: 2,
      subjects: [
        subject({ id: 1, code: 'CSL201', name: 'Programming Lab', weeklyHours: 2 }),
        subject({ id: 2, code: 'CS101', name: 'Programming', weeklyHours: 1 }),
      ],
      rooms: [room(), room({ id: 2, name: 'Lab 1', type: 'Laboratory' })],
      patternRules: { sectionMaxDailyHours: 2 },
      previous: [
        { id: 'old-lab', day: 'Monday', start: 8, duration: 2, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CSL201', subjectName: 'Programming Lab', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Lab 1', isLab: true, color: 0 },
        { id: 'old-class', day: 'Monday', start: 8, duration: 1, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CS101', subjectName: 'Programming', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Room 1', isLab: false, color: 0 },
      ],
    }));

    const labMeeting = scheduledSubject(timetable, 'CSL201');
    const classMeeting = scheduledSubject(timetable, 'CS101');
    expect(labMeeting).toHaveLength(1);
    expect(classMeeting).toHaveLength(1);
    expect(labMeeting[0].day).toBe('Monday');
    expect(classMeeting[0].day).toBe('Tuesday');
  });

  it('reports a teaching-pattern diagnostic when no valid placement remains', () => {
    const timetable = generateTimetable(input({
      subjects: [subject({ weeklyHours: 2 })],
      patternRules: { sectionMaxDailyHours: 1 },
    }));

    expect(timetable.sessions).toHaveLength(1);
    expect(timetable.unscheduled).toHaveLength(1);
    expect(timetable.unscheduled[0].reason).toContain('Teaching-pattern rule sectionMaxDailyHours blocked');
    expect(timetable.unscheduled[0].hours).toBe(1);
  });

  it('diagnoses section daily-rule blocked hours after partially placing a three-hour subject', () => {
    const timetable = generateTimetable(input({
      subjects: [subject({ weeklyHours: 3 })],
      patternRules: { sectionMaxDailyHours: 2 },
    }));

    expect(timetable.sessions.reduce((hours, current) => hours + current.duration, 0)).toBe(2);
    expect(timetable.unscheduled).toHaveLength(1);
    expect(timetable.unscheduled[0].hours).toBe(1);
    expect(timetable.unscheduled[0].reason).toContain('Teaching-pattern rule sectionMaxDailyHours blocked');
    expect(timetable.unscheduled[0].reason).not.toContain('No common free slot for section, faculty and room');
  });

  it('does not report stale pattern rejections after later placements occupy those candidates', () => {
    const timetable = generateTimetable(input({
      days: 1,
      rooms: [room({ id: 1, name: 'Lab 1', type: 'Laboratory' })],
      sections: [
        section({ id: 1, name: 'Section A', shift: 'Shift 1' }),
        section({ id: 2, name: 'Section B', department: 'Math', shift: 'Shift 3' }),
      ],
      subjects: [
        subject({ id: 1, code: 'CSL101', name: 'Core Lab', weeklyHours: 4 }),
        subject({ id: 2, code: 'MAL201', name: 'Target Lab', department: 'Math', weeklyHours: 3 }),
      ],
      patternRules: { sectionMaxDailyHours: 2, facultyMaxConsecutiveHours: 3 },
      previous: [
        { id: 'previous-core', day: 'Monday', start: 8, duration: 2, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CSL101', subjectName: 'Core Lab', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Lab 1', isLab: true, color: 0 },
        { id: 'previous-target', day: 'Monday', start: 10, duration: 2, section: 'Section B', shift: 'Shift 3', department: 'Math', subjectCode: 'MAL201', subjectName: 'Target Lab', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Lab 1', isLab: true, color: 1 },
      ],
    }));

    const targetMeetings = scheduledSubject(timetable, 'MAL201');
    const targetUnscheduled = timetable.unscheduled.find((u) => u.subject === 'Target Lab');
    expect(targetMeetings).toHaveLength(1);
    expect(targetMeetings[0]).toMatchObject({ day: 'Monday', start: 11, duration: 2, isLab: true });
    expect(targetUnscheduled).toBeDefined();
    expect(targetUnscheduled?.hours).toBe(2);
    expect(targetUnscheduled?.reason).toBe('No common free slot for section, faculty and room');
    expect(targetUnscheduled?.reason).not.toContain('Teaching-pattern rule');
  });

  it('leaves an exact spacing-rejected slot available for a different subject', () => {
    const timetable = generateTimetable(input({
      days: 2,
      seed: 41021,
      restarts: 1,
      subjects: [
        subject({ id: 1, code: 'CS101', name: 'Core', weeklyHours: 2 }),
        subject({ id: 2, code: 'CS102', name: 'Elective', weeklyHours: 1 }),
      ],
      patternRules: { minSubjectGapDays: 1 },
      previous: [
        { id: 'previous-core', day: 'Tuesday', start: 8, duration: 1, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CS101', subjectName: 'Core', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Room 1', isLab: false, color: 0 },
        { id: 'previous-elective', day: 'Monday', start: 8, duration: 1, section: 'Section A', shift: 'Shift 1', department: 'CS', subjectCode: 'CS102', subjectName: 'Elective', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', room: 'Room 1', isLab: false, color: 0 },
      ],
    }));

    const core = scheduledSubject(timetable, 'CS101');
    const elective = scheduledSubject(timetable, 'CS102');
    expect(core).toHaveLength(1);
    expect(core[0]).toMatchObject({ day: 'Tuesday', start: 8 });
    expect(elective).toHaveLength(1);
    expect(elective[0]).toMatchObject({ day: 'Monday', start: 8 });
    expect(timetable.sessions).toHaveLength(2);
    expect(timetable.unscheduled.some((u) => u.subject === 'Core' && u.reason.includes('Teaching-pattern rule minSubjectGapDays blocked'))).toBe(true);
  });

  it('rejects blank faculty email when a faculty pattern rule is enabled', () => {
    expect(() => generateTimetable(input({
      faculty: [faculty({ email: '' })],
      patternRules: { facultyMaxDailyHours: 2 },
    }))).toThrow(/must have a nonblank email/);
  });

  it('rejects duplicate normalized faculty emails when faculty rules are enabled', () => {
    expect(() => generateTimetable(input({
      faculty: [
        faculty({ id: 1, name: 'Alex', department: 'CS', email: 'shared@example.edu' }),
        faculty({ id: 2, name: 'Blair', department: 'Math', email: ' SHARED@example.edu ' }),
      ],
      sections: [section({ id: 1, name: 'CS Section', department: 'CS' }), section({ id: 2, name: 'Math Section', department: 'Math' })],
      subjects: [
        subject({ id: 1, code: 'CS101', department: 'CS' }),
        subject({ id: 2, code: 'MA101', name: 'Calculus', department: 'Math' }),
      ],
      patternRules: { facultyMaxConsecutiveHours: 2 },
    }))).toThrow(/assigned to distinct faculty IDs/);
  });

  it.each([undefined, {}])('does not apply rule-specific faculty identity checks for rules %j', (patternRules) => {
    const timetable = generateTimetable(input({
      faculty: [faculty({ email: '' })],
      patternRules,
    }));
    expect(timetable.sessions).toHaveLength(1);
  });

  it('produces equivalent stable placements with omitted rules and empty rules', () => {
    const base = input({
      days: 5,
      subjects: [subject({ weeklyHours: 2 })],
    });
    const withoutRules = generateTimetable(base);
    const emptyRules = generateTimetable({ ...base, patternRules: {} });

    expect(stableSessions(withoutRules)).toEqual(stableSessions(emptyRules));
    expect(withoutRules.unscheduled.map(({ section, subject, hours, reason }) => ({ section, subject, hours, reason })))
      .toEqual(emptyRules.unscheduled.map(({ section, subject, hours, reason }) => ({ section, subject, hours, reason })));
  });
});
