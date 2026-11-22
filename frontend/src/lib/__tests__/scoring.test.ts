import { describe, expect, it } from 'vitest';
import { checkHardConstraints, scoreTimetable } from '../scoring';
import type { Session, Timetable } from '../scheduler';
import type { Faculty, Room, Section } from '../types';

const faculty = (overrides: Partial<Faculty> = {}): Faculty => ({
  id: 1,
  name: 'Alex Teacher',
  email: 'alex@example.edu',
  department: 'CS',
  available: true,
  preferredWindow: 'morning',
  ...overrides,
});

const room = (overrides: Partial<Room> = {}): Room => ({
  id: 1,
  name: 'Room 1',
  building: 'Main',
  type: 'Classroom',
  capacity: 20,
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

const session = (overrides: Partial<Session> = {}): Session => ({
  id: 'session-1',
  day: 'Monday',
  start: 8,
  duration: 1,
  section: 'Section A',
  shift: 'Shift 1',
  department: 'CS',
  subjectCode: 'CS101',
  subjectName: 'Programming',
  faculty: 'Alex Teacher',
  facultyEmail: 'alex@example.edu',
  room: 'Room 1',
  isLab: false,
  color: 0,
  ...overrides,
});

const timetable = (overrides: Partial<Timetable> = {}): Timetable => ({
  generatedAt: '2026-01-01T00:00:00.000Z',
  seed: 12345,
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  sessions: [session()],
  unscheduled: [],
  stats: {
    requiredHours: 1,
    scheduledHours: 1,
    sections: 1,
    facultyUsed: 1,
    roomsUsed: 1,
    roomUtilization: 0.05,
    ms: 0,
  },
  ...overrides,
});

const context = (overrides: { faculty?: Faculty[]; rooms?: Room[]; sections?: Section[] } = {}) => ({
  faculty: overrides.faculty ?? [faculty()],
  rooms: overrides.rooms ?? [room()],
  sections: overrides.sections ?? [section()],
});

const patternCheck = (tt: Timetable) =>
  checkHardConstraints(tt, context()).find((check) => check.key === 'teachingPatterns');

describe('checkHardConstraints teaching-pattern integration', () => {
  it('passes valid configured teaching patterns', () => {
    const check = patternCheck(timetable({
      patternRules: {
        sectionMaxDailyHours: 1,
        facultyMaxDailyHours: 1,
        sectionMaxConsecutiveHours: 1,
        facultyMaxConsecutiveHours: 1,
        minSubjectGapDays: 1,
      },
    }));

    expect(check?.passed).toBe(true);
    expect(check?.violations).toEqual([]);
  });

  it('fails sectionMaxDailyHours when a section exceeds its daily limit', () => {
    const tt = timetable({
      sessions: [session(), session({ id: 'session-2', start: 10, subjectCode: 'CS102', subjectName: 'Data Structures' })],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2 },
      patternRules: { sectionMaxDailyHours: 1 },
    });

    const check = patternCheck(tt);
    expect(check?.passed).toBe(false);
    expect(check?.violations.some((v) => v.includes('sectionMaxDailyHours') && v.includes('2 teaching hours'))).toBe(true);
  });

  it('fails facultyMaxDailyHours across different sections', () => {
    const tt = timetable({
      sessions: [
        session(),
        session({ id: 'session-2', start: 10, section: 'Section B', subjectCode: 'MA101', subjectName: 'Calculus', department: 'Math' }),
      ],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2, sections: 2 },
      patternRules: { facultyMaxDailyHours: 1 },
    });
    const ctx = context({ sections: [section(), section({ id: 2, name: 'Section B', department: 'Math' })] });

    const check = checkHardConstraints(tt, ctx).find((item) => item.key === 'teachingPatterns');
    expect(check?.passed).toBe(false);
    expect(check?.violations.some((v) => v.includes('facultyMaxDailyHours') && v.includes('2 teaching hours'))).toBe(true);
  });

  it('fails sectionMaxConsecutiveHours across different subjects', () => {
    const tt = timetable({
      sessions: [
        session(),
        session({ id: 'session-2', start: 9, subjectCode: 'CS102', subjectName: 'Data Structures' }),
      ],
      patternRules: { sectionMaxConsecutiveHours: 1 },
    });

    const check = patternCheck(tt);
    expect(check?.passed).toBe(false);
    expect(check?.violations.some((v) => v.includes('sectionMaxConsecutiveHours'))).toBe(true);
  });

  it('fails facultyMaxConsecutiveHours across different sections', () => {
    const tt = timetable({
      sessions: [
        session(),
        session({ id: 'session-2', start: 9, section: 'Section B', department: 'Math', subjectCode: 'MA101', subjectName: 'Calculus' }),
      ],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2, sections: 2 },
      patternRules: { facultyMaxConsecutiveHours: 1 },
    });
    const ctx = context({ sections: [section(), section({ id: 2, name: 'Section B', department: 'Math' })] });

    const check = checkHardConstraints(tt, ctx).find((item) => item.key === 'teachingPatterns');
    expect(check?.passed).toBe(false);
    expect(check?.violations.some((v) => v.includes('facultyMaxConsecutiveHours'))).toBe(true);
  });

  it('fails minSubjectGapDays for repeated meetings with no intervening day', () => {
    const tt = timetable({
      sessions: [
        session(),
        session({ id: 'session-2', day: 'Tuesday', subjectCode: 'CS101' }),
      ],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2 },
      patternRules: { minSubjectGapDays: 1 },
    });

    const check = patternCheck(tt);
    expect(check?.passed).toBe(false);
    expect(check?.violations.some((v) => v.includes('minSubjectGapDays') && v.includes('0 intervening configured teaching days'))).toBe(true);
  });

  it('independently counts both occupied hours of a two-hour lab', () => {
    const tt = timetable({
      sessions: [session({ duration: 2, subjectCode: 'CSL201', subjectName: 'Programming Lab', isLab: true })],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2 },
      patternRules: { sectionMaxDailyHours: 1, sectionMaxConsecutiveHours: 1 },
    });
    const ctx = context({ rooms: [room({ type: 'Laboratory' })] });

    const checks = checkHardConstraints(tt, ctx);
    const pattern = checks.find((check) => check.key === 'teachingPatterns');
    expect(pattern?.passed).toBe(false);
    expect(pattern?.violations.some((v) => v.includes('sectionMaxDailyHours') && v.includes('2 teaching hours'))).toBe(true);
    expect(pattern?.violations.some((v) => v.includes('sectionMaxConsecutiveHours') && v.includes('2 consecutive teaching hours'))).toBe(true);
    expect(checks.find((check) => check.key === 'labs')?.passed).toBe(true);
  });

  it('retains the seven legacy hard checks and behavior when patternRules is absent', () => {
    const tt = timetable({
      sessions: [
        session(),
        session({ id: 'session-2', start: 10, subjectCode: 'CS102', subjectName: 'Data Structures' }),
      ],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2 },
    });
    const checks = checkHardConstraints(tt, context());

    expect(checks.map((check) => check.key)).toEqual([
      'faculty', 'section', 'room', 'capacity', 'labs', 'availability', 'hours',
    ]);
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it('does not report unexpected teaching-pattern violations for an empty rules object', () => {
    const check = patternCheck(timetable({ patternRules: {} }));

    expect(check?.passed).toBe(true);
    expect(check?.violations).toEqual([]);
  });
});

describe('scoreTimetable hard-constraint reporting', () => {
  it('reflects pattern hard-check failures in hardPassed and hardTotal', () => {
    const ctx = context();
    const valid = timetable({ patternRules: { sectionMaxDailyHours: 2 } });
    const invalid = timetable({
      sessions: [session({ duration: 2 })],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2 },
      patternRules: { sectionMaxDailyHours: 1 },
    });

    const validScore = scoreTimetable(valid, ctx);
    const invalidScore = scoreTimetable(invalid, ctx);
    expect(validScore.hardTotal).toBe(8);
    expect(validScore.hardPassed).toBe(8);
    expect(invalidScore.hardTotal).toBe(8);
    expect(invalidScore.hardPassed).toBe(7);
  });

  it('does not treat a pattern violation as fully valid when soft components score well', () => {
    const tt = timetable({
      sessions: [session({ duration: 2 })],
      stats: { ...timetable().stats, requiredHours: 2, scheduledHours: 2 },
      patternRules: { sectionMaxDailyHours: 1 },
    });
    const score = scoreTimetable(tt, context());

    expect(score.total).toBe(1);
    expect(score.components.every((component) => component.value === 1)).toBe(true);
    expect(score.hardPassed).toBeLessThan(score.hardTotal);
    expect(patternCheck(tt)?.passed).toBe(false);
  });
});
