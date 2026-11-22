import { describe, expect, it } from 'vitest';
import {
  validateTeachingPatternRules,
  validateTeachingPatternSessions,
} from '../teachingPatterns';

const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Session = {
  day?: string;
  start?: number;
  duration?: number;
  section?: string;
  subjectCode?: string;
  subjectName?: string;
  faculty?: string;
  facultyEmail?: string;
};

const session = (overrides: Session = {}): Session => ({
  day: 'Monday',
  start: 9,
  duration: 1,
  section: 'Section A',
  subjectCode: 'CS101',
  subjectName: 'Programming',
  faculty: 'Alex Teacher',
  facultyEmail: 'alex@example.edu',
  ...overrides,
});

const hasViolation = (errors: string[], text: string) =>
  errors.some((error) => error.includes(text));

describe('validateTeachingPatternRules', () => {
  it('accepts valid positive integer values for all five rules', () => {
    expect(validateTeachingPatternRules({
      sectionMaxDailyHours: 6,
      facultyMaxDailyHours: 8,
      sectionMaxConsecutiveHours: 3,
      facultyMaxConsecutiveHours: 4,
      minSubjectGapDays: 2,
    })).toEqual([]);
  });

  it('accepts omitted rules and omitted optional rule values', () => {
    expect(validateTeachingPatternRules(undefined)).toEqual([]);
    expect(validateTeachingPatternRules({})).toEqual([]);
    expect(validateTeachingPatternRules({ sectionMaxDailyHours: undefined })).toEqual([]);
  });

  it.each([0, -1, 1.5, Infinity, NaN])('rejects invalid rule value %s', (value) => {
    expect(validateTeachingPatternRules({ sectionMaxDailyHours: value }))
      .toContain('sectionMaxDailyHours must be a positive finite integer');
  });

  it('rejects unknown rule keys', () => {
    expect(validateTeachingPatternRules({ sectionMaxDailyHours: 4, unknownLimit: 2 }))
      .toContain('Unknown teaching pattern rule: unknownLimit');
  });
});

describe('validateTeachingPatternSessions', () => {
  it('allows section daily hours at the exact limit and rejects hours above it', () => {
    const sessions = [session({ duration: 2 }), session({ start: 11, duration: 2 })];
    expect(validateTeachingPatternSessions(sessions, week, { sectionMaxDailyHours: 4 })).toEqual([]);

    const overLimit = validateTeachingPatternSessions(
      [...sessions, session({ start: 13, duration: 1 })], week, { sectionMaxDailyHours: 4 },
    );
    expect(hasViolation(overLimit, 'sectionMaxDailyHours:')).toBe(true);
    expect(hasViolation(overLimit, 'has 5 teaching hours')).toBe(true);
  });

  it('aggregates faculty daily hours across sections using normalized email', () => {
    const errors = validateTeachingPatternSessions([
      session({ section: 'Section A', facultyEmail: ' Alex@Example.edu ', duration: 2 }),
      session({ section: 'Section B', faculty: 'Different Display Name', facultyEmail: 'alex@example.edu', start: 12, duration: 2 }),
    ], week, { facultyMaxDailyHours: 3 });

    expect(hasViolation(errors, 'facultyMaxDailyHours:')).toBe(true);
    expect(hasViolation(errors, 'has 4 teaching hours')).toBe(true);
  });

  it('counts the full duration of a two-hour lab session', () => {
    const errors = validateTeachingPatternSessions(
      [session({ subjectCode: 'CSL101', subjectName: 'Programming Lab', duration: 2 })],
      week,
      { sectionMaxDailyHours: 1 },
    );

    expect(hasViolation(errors, 'has 2 teaching hours')).toBe(true);
  });

  it('combines adjacent section hours across different subjects', () => {
    const errors = validateTeachingPatternSessions([
      session({ start: 9, subjectCode: 'CS101' }),
      session({ start: 10, subjectCode: 'MA101', subjectName: 'Mathematics' }),
    ], week, { sectionMaxConsecutiveHours: 1 });

    expect(hasViolation(errors, 'sectionMaxConsecutiveHours:')).toBe(true);
    expect(hasViolation(errors, 'has 2 consecutive teaching hours')).toBe(true);
  });

  it('combines adjacent faculty hours across different sections', () => {
    const errors = validateTeachingPatternSessions([
      session({ section: 'Section A', start: 9 }),
      session({ section: 'Section B', start: 10 }),
    ], week, { facultyMaxConsecutiveHours: 1 });

    expect(hasViolation(errors, 'facultyMaxConsecutiveHours:')).toBe(true);
    expect(hasViolation(errors, 'has 2 consecutive teaching hours')).toBe(true);
  });

  it('breaks a consecutive run at a genuine clock-hour gap', () => {
    const errors = validateTeachingPatternSessions([
      session({ start: 9 }),
      session({ start: 11 }),
    ], week, { sectionMaxConsecutiveHours: 1 });

    expect(errors).toEqual([]);
  });

  it('reports two intervening days from Monday to Thursday in a six-day week', () => {
    const errors = validateTeachingPatternSessions([
      session({ day: 'Monday' }),
      session({ day: 'Thursday', start: 9 }),
    ], week, { minSubjectGapDays: 3 });

    expect(hasViolation(errors, 'Monday and Thursday with 2 intervening configured teaching days')).toBe(true);
  });

  it('checks Friday-to-Monday spacing across a Monday-through-Saturday week', () => {
    const errors = validateTeachingPatternSessions([
      session({ day: 'Friday' }),
      session({ day: 'Monday', start: 10 }),
    ], week, { minSubjectGapDays: 2 });

    expect(hasViolation(errors, 'Friday and Monday with 1 intervening configured teaching days')).toBe(true);
  });

  it('rejects repeated same-day subject meetings for a positive minimum gap', () => {
    const errors = validateTeachingPatternSessions([
      session({ start: 9 }),
      session({ start: 11 }),
    ], week, { minSubjectGapDays: 1 });

    expect(hasViolation(errors, 'with 0 intervening configured teaching days')).toBe(true);
  });

  it('allows a subject with a single weekly occurrence', () => {
    expect(validateTeachingPatternSessions(
      [session()], week, { minSubjectGapDays: 1 },
    )).toEqual([]);
  });

  it('uses subject name as the spacing identity when subject code is unavailable', () => {
    const errors = validateTeachingPatternSessions([
      session({ subjectCode: '', subjectName: 'Algorithms', day: 'Monday' }),
      session({ subjectCode: '', subjectName: 'Algorithms', day: 'Tuesday', start: 9 }),
    ], week, { minSubjectGapDays: 1 });

    expect(hasViolation(errors, 'subject "Algorithms"')).toBe(true);
  });

  it('infers a missing faculty email when the name uniquely maps to one email', () => {
    const errors = validateTeachingPatternSessions([
      session({ section: 'Section A', faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', duration: 2 }),
      session({ section: 'Section B', faculty: ' Alex Teacher ', facultyEmail: '', start: 12, duration: 2 }),
    ], week, { facultyMaxDailyHours: 3 });

    expect(hasViolation(errors, 'Faculty identity validation:')).toBe(false);
    expect(hasViolation(errors, 'has 4 teaching hours')).toBe(true);
  });

  it('reports an ambiguous missing faculty email and skips faculty aggregation for it', () => {
    const errors = validateTeachingPatternSessions([
      session({ faculty: 'Alex Teacher', facultyEmail: 'alex@example.edu', duration: 2 }),
      session({ faculty: 'Alex Teacher', facultyEmail: 'alex.other@example.edu', start: 12, duration: 2 }),
      session({ section: 'Section C', faculty: ' Alex Teacher ', facultyEmail: '', start: 15, duration: 2 }),
    ], week, { facultyMaxDailyHours: 3 });

    expect(hasViolation(errors, 'matches more than one email')).toBe(true);
    expect(hasViolation(errors, 'facultyMaxDailyHours:')).toBe(false);
  });

  it('handles missing session records and incomplete day data safely', () => {
    const errors = validateTeachingPatternSessions(
      [null, session({ day: ' ' })] as unknown as Parameters<typeof validateTeachingPatternSessions>[0],
      week,
      { sectionMaxDailyHours: 2 },
    );

    expect(hasViolation(errors, 'timetable session 1 is missing or invalid')).toBe(true);
    expect(hasViolation(errors, 'session 2 has a missing or blank day')).toBe(true);
  });

  it('rejects an out-of-week day with only sectionMaxDailyHours enabled', () => {
    const errors = validateTeachingPatternSessions(
      [session({ day: 'Sunday' })], week, { sectionMaxDailyHours: 1 },
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('day "Sunday" outside the configured teaching days');
  });

  it('rejects an out-of-week day with only facultyMaxDailyHours enabled', () => {
    const errors = validateTeachingPatternSessions(
      [session({ day: 'Sunday' })], week, { facultyMaxDailyHours: 1 },
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('day "Sunday" outside the configured teaching days');
  });

  it('does not include an out-of-week day in consecutive-hour calculations', () => {
    const errors = validateTeachingPatternSessions(
      [session({ day: 'Sunday', duration: 2 })], week, { sectionMaxConsecutiveHours: 1 },
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('outside the configured teaching days');
    expect(hasViolation(errors, 'sectionMaxConsecutiveHours:')).toBe(false);
  });

  it('reports an out-of-week day once when subject spacing is enabled', () => {
    const errors = validateTeachingPatternSessions([
      session({ day: 'Sunday' }),
      session({ day: 'Tuesday', start: 10 }),
    ], week, { minSubjectGapDays: 1 });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('day "Sunday" outside the configured teaching days');
    expect(hasViolation(errors, 'minSubjectGapDays:')).toBe(false);
  });

  it('accepts a configured day after trimming and case normalization', () => {
    const errors = validateTeachingPatternSessions(
      [session({ day: ' monday ' })], week, { sectionMaxDailyHours: 1 },
    );

    expect(errors).toEqual([]);
  });

  it('aggregates valid configured-day sessions and excludes an out-of-week session', () => {
    const errors = validateTeachingPatternSessions([
      session({ day: 'Monday' }),
      session({ day: ' monday ', start: 10 }),
      session({ day: 'Sunday', duration: 10 }),
    ], week, { sectionMaxDailyHours: 1 });

    expect(errors).toHaveLength(2);
    expect(hasViolation(errors, 'outside the configured teaching days')).toBe(true);
    expect(hasViolation(errors, 'Section "Section A" has 2 teaching hours on Monday')).toBe(true);
    expect(hasViolation(errors, '12 teaching hours')).toBe(false);
  });
});
