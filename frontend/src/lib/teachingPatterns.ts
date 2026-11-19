/** Optional hard limits and spacing rules for teaching-pattern optimization. */
export type TeachingPatternRules = {
  /** Maximum teaching hours assigned to one section on a configured teaching day. */
  sectionMaxDailyHours?: number;
  /** Maximum teaching hours assigned to one faculty member on a configured teaching day. */
  facultyMaxDailyHours?: number;
  /** Maximum contiguous teaching hours for one section in a day. */
  sectionMaxConsecutiveHours?: number;
  /** Maximum contiguous teaching hours for one faculty member in a day. */
  facultyMaxConsecutiveHours?: number;
  /** Full configured teaching days that must intervene between repeated section-subject meetings. */
  minSubjectGapDays?: number;
};

const RULE_KEYS = [
  'sectionMaxDailyHours',
  'facultyMaxDailyHours',
  'sectionMaxConsecutiveHours',
  'facultyMaxConsecutiveHours',
  'minSubjectGapDays',
] as const satisfies readonly (keyof TeachingPatternRules)[];

/** Returns configuration errors; omitted rules and omitted fields are valid. */
export function validateTeachingPatternRules(value: unknown): string[] {
  if (value === undefined) return [];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return ['Teaching pattern rules must be an object'];
  }

  const rules = value as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(rules)) {
    if (!(RULE_KEYS as readonly string[]).includes(key)) {
      errors.push(`Unknown teaching pattern rule: ${key}`);
    }
  }

  for (const key of RULE_KEYS) {
    const limit = rules[key];
    if (limit === undefined) continue;
    if (typeof limit !== 'number' || !Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) {
      errors.push(`${key} must be a positive finite integer`);
    }
  }

  return errors;
}

type TeachingPatternSession = {
  day?: unknown;
  start?: unknown;
  duration?: unknown;
  section?: unknown;
  subjectCode?: unknown;
  subjectName?: unknown;
  faculty?: unknown;
  facultyEmail?: unknown;
};

const normalize = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const display = (value: unknown, fallback: string) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value > 0;

function longestConsecutiveRun(hours: Set<number>) {
  const sorted = [...hours].sort((a, b) => a - b);
  let longest = 0;
  let currentLength = 0;
  let runStart = 0;
  let bestStart = 0;
  let bestEnd = 0;
  let previous: number | undefined;

  for (const hour of sorted) {
    currentLength = previous === hour - 1 ? currentLength + 1 : 1;
    if (currentLength === 1) runStart = hour;
    if (currentLength > longest) {
      longest = currentLength;
      bestStart = runStart;
      bestEnd = hour;
    }
    previous = hour;
  }

  return { length: longest, start: bestStart, end: bestEnd };
}

/**
 * Independently validates pattern rules by rebuilding hour totals and meetings
 * from timetable sessions. `days` defines the configured weekly teaching order.
 */
export function validateTeachingPatternSessions(
  sessions: readonly TeachingPatternSession[],
  days: readonly string[],
  rules: TeachingPatternRules
): string[] {
  const ruleErrors = validateTeachingPatternRules(rules);
  const violations = ruleErrors.map((error) => `Invalid teaching-pattern configuration: ${error}`);
  const safeRules = rules && typeof rules === 'object' && !Array.isArray(rules) ? rules : {};
  const configuredDays = Array.isArray(days) ? days.filter((day): day is string => typeof day === 'string' && Boolean(normalize(day))) : [];
  const dayIndex = new Map(configuredDays.map((day, index) => [normalize(day), index]));
  const validSessions: {
    day: string;
    dayLabel: string;
    start?: number;
    duration?: number;
    sectionKey?: string;
    sectionLabel: string;
    facultyKey?: string;
    facultyLabel: string;
    facultyEmailLabel: string;
    subjectKey?: string;
    subjectLabel: string;
  }[] = [];
  const inputSessions: unknown[] = Array.isArray(sessions) ? sessions : [];

  const emailsByFacultyName = new Map<string, Set<string>>();
  for (const candidate of inputSessions) {
    if (!candidate || typeof candidate !== 'object') continue;
    const session = candidate as TeachingPatternSession;
    const name = normalize(session.faculty);
    const email = normalize(session.facultyEmail);
    if (!name || !email) continue;
    const emails = emailsByFacultyName.get(name) ?? new Set<string>();
    emails.add(email);
    emailsByFacultyName.set(name, emails);
  }

  const needsSection = isPositiveInteger(safeRules.sectionMaxDailyHours)
    || isPositiveInteger(safeRules.sectionMaxConsecutiveHours)
    || isPositiveInteger(safeRules.minSubjectGapDays);
  const needsFaculty = isPositiveInteger(safeRules.facultyMaxDailyHours)
    || isPositiveInteger(safeRules.facultyMaxConsecutiveHours);
  const needsDuration = isPositiveInteger(safeRules.sectionMaxDailyHours)
    || isPositiveInteger(safeRules.facultyMaxDailyHours)
    || isPositiveInteger(safeRules.sectionMaxConsecutiveHours)
    || isPositiveInteger(safeRules.facultyMaxConsecutiveHours);

  for (const [index, candidate] of inputSessions.entries()) {
    if (!candidate || typeof candidate !== 'object') {
      violations.push(`Session data validation: timetable session ${index + 1} is missing or invalid; pattern checks were skipped for it.`);
      continue;
    }

    const session = candidate as TeachingPatternSession;
    const day = normalize(session.day);
    const dayLabel = display(session.day, 'unknown day');
    if (!day) {
      violations.push(`Session data validation: session ${index + 1} has a missing or blank day; day-based pattern checks were skipped for it.`);
      continue;
    }
    if (!dayIndex.has(day)) {
      violations.push(`Session data validation: session ${index + 1} has day "${dayLabel}" outside the configured teaching days; pattern checks were skipped for it.`);
      continue;
    }

    const duration = isPositiveInteger(session.duration) ? session.duration : undefined;
    if (needsDuration && duration === undefined) {
      violations.push(`Session data validation: session ${index + 1} on ${dayLabel} has a missing or invalid duration; daily-hour and consecutive-hour checks were skipped for it.`);
    }

    const start = typeof session.start === 'number' && Number.isFinite(session.start) && Number.isInteger(session.start)
      ? session.start
      : undefined;
    if ((isPositiveInteger(safeRules.sectionMaxConsecutiveHours) || isPositiveInteger(safeRules.facultyMaxConsecutiveHours)) && start === undefined) {
      violations.push(`Session data validation: session ${index + 1} on ${dayLabel} has a missing or invalid start time; consecutive-hour checks were skipped for it.`);
    }

    const sectionKey = normalize(session.section);
    const sectionLabel = display(session.section, `unknown section (session ${index + 1})`);
    if (needsSection && !sectionKey) {
      violations.push(`Section identity validation: session ${index + 1} on ${dayLabel} has a missing or blank section name; section-based pattern checks were skipped for it.`);
    }

    const facultyNameKey = normalize(session.faculty);
    const emailValue = normalize(session.facultyEmail);
    let facultyKey = emailValue || undefined;
    if (needsFaculty && !facultyKey) {
      const matchingEmails = facultyNameKey ? emailsByFacultyName.get(facultyNameKey) : undefined;
      if (matchingEmails?.size === 1) {
        facultyKey = [...matchingEmails][0];
      } else {
        const name = display(session.faculty, 'missing name');
        const reason = matchingEmails?.size ? 'matches more than one email' : 'does not uniquely identify a faculty member';
        violations.push(`Faculty identity validation: ${name} on ${dayLabel} has a missing or blank email and ${reason}; faculty-based pattern checks were skipped for this session.`);
      }
    }
    const facultyLabel = display(session.faculty, emailValue ? `faculty ${emailValue}` : 'unknown faculty');
    const facultyEmailLabel = emailValue || (facultyKey ?? 'unidentified');

    const subjectCodeKey = normalize(session.subjectCode);
    const subjectNameKey = normalize(session.subjectName);
    const subjectKey = subjectCodeKey
      ? `code:${subjectCodeKey}`
      : subjectNameKey
        ? `name:${subjectNameKey}`
        : undefined;
    const subjectLabel = display(session.subjectName, display(session.subjectCode, 'unknown subject'));
    if (isPositiveInteger(safeRules.minSubjectGapDays) && !subjectKey) {
      violations.push(`Subject identity validation: session ${index + 1} for section ${sectionLabel} on ${dayLabel} has no subject code or subject name; subject-spacing validation was skipped for it.`);
    }

    validSessions.push({
      day,
      dayLabel,
      start,
      duration,
      sectionKey: sectionKey || undefined,
      sectionLabel,
      facultyKey: needsFaculty ? facultyKey : emailValue || undefined,
      facultyLabel,
      facultyEmailLabel,
      subjectKey,
      subjectLabel,
    });
  }

  if (isPositiveInteger(safeRules.sectionMaxDailyHours)) {
    const totals = new Map<string, { label: string; day: string; hours: number }>();
    for (const session of validSessions) {
      if (!session.sectionKey || session.duration === undefined) continue;
      const key = JSON.stringify([session.sectionKey, session.day]);
      const total = totals.get(key) ?? { label: session.sectionLabel, day: session.dayLabel, hours: 0 };
      total.hours += session.duration;
      totals.set(key, total);
    }
    for (const { label, day, hours } of totals.values()) {
      if (hours > safeRules.sectionMaxDailyHours) {
        violations.push(`sectionMaxDailyHours: Section "${label}" has ${hours} teaching hours on ${day}; maximum is ${safeRules.sectionMaxDailyHours}.`);
      }
    }
  }

  if (isPositiveInteger(safeRules.facultyMaxDailyHours)) {
    const totals = new Map<string, { name: string; email: string; day: string; hours: number }>();
    for (const session of validSessions) {
      if (!session.facultyKey || session.duration === undefined) continue;
      const key = JSON.stringify([session.facultyKey, session.day]);
      const total = totals.get(key) ?? { name: session.facultyLabel, email: session.facultyEmailLabel, day: session.dayLabel, hours: 0 };
      total.hours += session.duration;
      totals.set(key, total);
    }
    for (const { name, email, day, hours } of totals.values()) {
      if (hours > safeRules.facultyMaxDailyHours) {
        violations.push(`facultyMaxDailyHours: Faculty "${name}" (${email}) has ${hours} teaching hours on ${day}; maximum is ${safeRules.facultyMaxDailyHours}.`);
      }
    }
  }

  const checkConsecutive = (rule: 'sectionMaxConsecutiveHours' | 'facultyMaxConsecutiveHours', limit: number) => {
    const occupied = new Map<string, { label: string; day: string; hours: Set<number> }>();
    for (const session of validSessions) {
      if (session.duration === undefined || session.start === undefined) continue;
      const identity = rule === 'sectionMaxConsecutiveHours' ? session.sectionKey : session.facultyKey;
      if (!identity) continue;
      const label = rule === 'sectionMaxConsecutiveHours'
        ? `Section "${session.sectionLabel}"`
        : `Faculty "${session.facultyLabel}" (${session.facultyEmailLabel})`;
      const key = JSON.stringify([identity, session.day]);
      const group = occupied.get(key) ?? { label, day: session.dayLabel, hours: new Set<number>() };
      for (let offset = 0; offset < session.duration; offset++) group.hours.add(session.start + offset);
      occupied.set(key, group);
    }

    for (const { label, day, hours } of occupied.values()) {
      const run = longestConsecutiveRun(hours);
      if (run.length > limit) {
        violations.push(`${rule}: ${label} has ${run.length} consecutive teaching hours on ${day} (${run.start}:00-${run.end + 1}:00); maximum is ${limit}.`);
      }
    }
  };

  if (isPositiveInteger(safeRules.sectionMaxConsecutiveHours)) {
    checkConsecutive('sectionMaxConsecutiveHours', safeRules.sectionMaxConsecutiveHours);
  }
  if (isPositiveInteger(safeRules.facultyMaxConsecutiveHours)) {
    checkConsecutive('facultyMaxConsecutiveHours', safeRules.facultyMaxConsecutiveHours);
  }

  if (isPositiveInteger(safeRules.minSubjectGapDays)) {
    const meetings = new Map<string, typeof validSessions>();
    for (const session of validSessions) {
      if (!session.sectionKey || !session.subjectKey) continue;
      const key = JSON.stringify([session.sectionKey, session.subjectKey]);
      meetings.set(key, [...(meetings.get(key) ?? []), session]);
    }

    for (const group of meetings.values()) {
      if (group.length < 2) continue;
      const ordered = [...group].sort((a, b) =>
        dayIndex.get(a.day)! - dayIndex.get(b.day)! || (a.start ?? 0) - (b.start ?? 0)
      );
      const configuredDayCount = configuredDays.length;
      for (let index = 0; index < ordered.length; index++) {
        const current = ordered[index];
        const next = ordered[(index + 1) % ordered.length];
        const currentIndex = dayIndex.get(current.day)!;
        const nextIndex = dayIndex.get(next.day)!;
        // The timetable repeats weekly, so also check the interval across week end.
        const gap = index === ordered.length - 1
          ? configuredDayCount - currentIndex - 1 + nextIndex
          : Math.max(0, nextIndex - currentIndex - 1);
        if (gap < safeRules.minSubjectGapDays) {
          violations.push(`minSubjectGapDays: Section "${current.sectionLabel}" subject "${current.subjectLabel}" has meetings on ${current.dayLabel} and ${next.dayLabel} with ${gap} intervening configured teaching days; minimum is ${safeRules.minSubjectGapDays}.`);
        }
      }
    }
  }

  return [...new Set(violations)];
}
