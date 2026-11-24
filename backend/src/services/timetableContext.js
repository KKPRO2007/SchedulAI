// Retrieval for the assistant: pick the timetable facts relevant to a question.
// The LLM (or the template fallback) only ever sees what this module returns.

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TEACHING_HOURS = [8, 9, 10, 11, 12, 14, 15, 16, 17];
const SHIFT_HOURS = {
  'Shift 1': [8, 9, 10, 11, 12],
  'Shift 2': [11, 12, 14, 15, 16],
  'Shift 3': [9, 10, 11, 12, 14],
  'Shift 4': [12, 14, 15, 16, 17],
};
export const MAX_SESSION_LINES = 80;

export function normalizeLookup(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function fmtHour(hour) {
  return `${((hour + 11) % 12) + 1}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

function sessionHours(session) {
  const duration = Number(session.duration) > 0 ? Number(session.duration) : 1;
  return Array.from({ length: duration }, (_, i) => Number(session.start) + i);
}

export function describeSession(session) {
  const end = Number(session.start) + (Number(session.duration) > 0 ? Number(session.duration) : 1);
  const code = session.subjectCode ? `${session.subjectCode} ` : '';
  const lab = session.isLab ? ' (lab)' : '';
  return `${session.day} ${fmtHour(Number(session.start))}–${fmtHour(end)} · ${code}${session.subjectName}${lab} · ${session.section} · ${session.faculty} · ${session.room}`;
}

function sortSessions(sessions) {
  return [...sessions].sort((a, b) =>
    DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start - b.start || String(a.section).localeCompare(String(b.section)));
}

/** Weekday name in the campus time zone, shifted by `offset` days. */
export function weekdayName(offset = 0, timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata') {
  const date = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(date);
}

/** Restrict sessions to what this user may see. */
export function scopeSessions(sessions, user) {
  if (user?.role === 'faculty') {
    const email = String(user.email ?? '').toLowerCase();
    return sessions.filter((s) => String(s.facultyEmail ?? '').toLowerCase() === email);
  }
  if (user?.role === 'student') {
    const section = normalizeLookup(user.section);
    return section ? sessions.filter((s) => normalizeLookup(s.section) === section) : [];
  }
  return sessions;
}

/** Values named in the question; a longer match wins ("Data Structures Lab" over "Data Structures"). */
function matchValues(normalizedQuestion, values) {
  const hits = values.filter((value) => {
    const n = normalizeLookup(value);
    return n && normalizedQuestion.includes(` ${n} `);
  });
  return hits.filter((value) => {
    const n = ` ${normalizeLookup(value)} `;
    return !hits.some((other) => other !== value && ` ${normalizeLookup(other)} `.includes(n));
  });
}

/** True when two words differ by at most one edit or one swapped pair of letters. */
function closeEnough(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let prevPrev = prev;
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], prevPrev[j - 2] + 1);
    }
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length] <= 1;
}

const COMMON_SHORT_WORDS = new Set(['is', 'in', 'on', 'at', 'me', 'my', 'do', 'so', 'to', 'of', 'or', 'an', 'as', 'be', 'by', 'it', 'we', 'us', 'no', 'up', 'go', 'he', 'am', 'hi', 'ok', 'pm', 'id', 'if']);
const NAME_FILLERS = new Set(['of', 'and', 'the', 'for', 'in']);
/** Common abbreviations whose letters are not simply the initials of the subject name. */
const SUBJECT_ALIASES = {
  dbms: 'database management systems',
  oops: 'object oriented programming',
  dsa: 'data structures',
  maths: 'mathematics',
  math: 'mathematics',
  coa: 'computer organization',
  daa: 'design and analysis of algorithms',
};

function initialsOf(name) {
  const words = normalizeLookup(name).split(' ').filter(Boolean);
  const all = words.map((w) => w[0]).join('');
  const significant = words.filter((w) => !NAME_FILLERS.has(w)).map((w) => w[0]).join('');
  return [...new Set([all, significant])].filter((i) => i.length >= 2);
}

/**
 * Subjects named by exact text, by initials ("OS", "TOC"), by a common alias ("DBMS"),
 * or with one typo per word ("opertaing systems").
 */
function matchSubjects(question, q, names) {
  const literal = matchValues(q, names);
  const words = q.trim().split(' ');
  const shortTokens = new Set(words.filter((w) => w.length >= 2 && w.length <= 5));
  const covered = (token) => literal.some((name) => ` ${normalizeLookup(name)} `.includes(` ${token} `));

  const byAlias = names.filter((name) => {
    const n = normalizeLookup(name);
    if (/\blab\b/.test(n) && !/\b(lab|labs|practical)\b/.test(q)) return false;
    const base = n.replace(/\s*\blab\b\s*/g, ' ').trim();
    const aliasHit = Object.entries(SUBJECT_ALIASES).some(([alias, full]) => shortTokens.has(alias) && !covered(alias) && base.includes(full));
    const initialsHit = initialsOf(base).some((ini) => shortTokens.has(ini) && !covered(ini)
      && (ini.length >= 3 || !COMMON_SHORT_WORDS.has(ini)));
    return aliasHit || initialsHit;
  });

  let fuzzy = [];
  if (!literal.length && !byAlias.length) {
    fuzzy = names.filter((name) => {
      const parts = normalizeLookup(name).split(' ').filter((w) => w.length >= 3 && !NAME_FILLERS.has(w) && w !== 'lab');
      return parts.length > 0 && parts.every((part) => words.some((w) => closeEnough(w, part)));
    });
  }
  const all = [...new Set([...literal, ...byAlias, ...fuzzy])];
  // "ML lab" means the lab, not the theory course with the same initials.
  if (/\b(lab|labs|practical)\b/.test(q)) {
    const isLab = (n) => /\blab\b/i.test(n);
    const labBases = new Set(all.filter(isLab).map((n) => normalizeLookup(n).replace(/\s*\blab\b/g, '').trim()));
    return all.filter((n) => isLab(n) || !labBases.has(normalizeLookup(n)));
  }
  return all;
}

/** Faculty match on full name or on a distinctive name part (e.g. "Sharma", or "Banerjee" typed "Banerje"). */
function matchFaculty(normalizedQuestion, names) {
  const honorifics = new Set(['dr', 'prof', 'mr', 'mrs', 'ms']);
  const words = normalizedQuestion.trim().split(' ');
  const exact = names.filter((name) => {
    const n = normalizeLookup(name);
    if (!n) return false;
    if (normalizedQuestion.includes(` ${n} `)) return true;
    return n.split(' ').some((part) => part.length >= 4 && !honorifics.has(part) && normalizedQuestion.includes(` ${part} `));
  });
  if (exact.length) return exact;
  return names.filter((name) => normalizeLookup(name).split(' ')
    .some((part) => part.length >= 5 && !honorifics.has(part) && words.some((w) => closeEnough(w, part))));
}

/** "10am", "2 pm", "10 30 am", "at 2", "11 o clock" → 24h hours. Bare "at 1–6" means afternoon. */
function parseHours(q) {
  const hours = new Set();
  const add = (hour, suffix) => {
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (!suffix && hour >= 1 && hour <= 6) hour += 12;
    if (hour >= 7 && hour <= 18) hours.add(hour);
  };
  for (const m of q.matchAll(/ (\d{1,2})(?: \d{2})? ?(am|pm)(?= )/g)) add(Number(m[1]), m[2]);
  for (const m of q.matchAll(/ (?:at|from|around|by) (\d{1,2})(?: \d{2})?(?= (?!am|pm))/g)) add(Number(m[1]));
  for (const m of q.matchAll(/ (\d{1,2}) o clock(?= )/g)) add(Number(m[1]));
  return [...hours];
}

/** Pull days, times and timetable entities out of a question. */
export function extractEntities(question, sessions) {
  const q = ` ${normalizeLookup(question)} `;
  const days = DAYS.filter((day) => q.includes(` ${day.toLowerCase()} `) || q.includes(` ${day.slice(0, 3).toLowerCase()} `));
  if (q.includes(' today ')) days.push(weekdayName(0));
  if (q.includes(' tomorrow ')) days.push(weekdayName(1));

  const unique = (field) => [...new Set(sessions.map((s) => s[field]).filter(Boolean))];
  const subjectNames = matchSubjects(question, q, unique('subjectName'));
  const subjectCodes = matchValues(q, unique('subjectCode'));
  return {
    days: [...new Set(days)].filter((d) => DAYS.includes(d)),
    hours: parseHours(q),
    period: q.includes(' morning ') ? 'morning' : (q.includes(' afternoon ') || q.includes(' after lunch ') || q.includes(' evening ')) ? 'afternoon' : null,
    subjects: [...new Set([...subjectNames, ...sessions.filter((s) => subjectCodes.includes(s.subjectCode)).map((s) => s.subjectName)])],
    rooms: matchValues(q, unique('room')),
    faculty: matchFaculty(q, unique('faculty')),
    sections: matchValues(q, unique('section')),
    labsOnly: /\b(lab|labs|laboratory|practical)\b/.test(q),
  };
}

export function hasEntities(e) {
  return Boolean(e.days.length || e.hours.length || e.period || e.subjects.length || e.rooms.length || e.faculty.length || e.sections.length);
}

function inPeriod(hour, period) {
  if (period === 'morning') return hour < 12;
  if (period === 'afternoon') return hour >= 12;
  return true;
}

export function filterSessions(sessions, e, { ignoreTime = false } = {}) {
  return sessions.filter((s) => {
    if (e.days.length && !e.days.includes(s.day)) return false;
    if (e.subjects.length && !e.subjects.includes(s.subjectName)) return false;
    if (e.rooms.length && !e.rooms.includes(s.room)) return false;
    if (e.faculty.length && !e.faculty.includes(s.faculty)) return false;
    if (e.sections.length && !e.sections.includes(s.section)) return false;
    if (!ignoreTime) {
      const hours = sessionHours(s);
      if (e.hours.length && !hours.some((h) => e.hours.includes(h))) return false;
      if (e.period && !hours.some((h) => inPeriod(h, e.period))) return false;
    }
    return true;
  });
}

/** Rooms with no class at the asked day/hours, using the whole campus timetable. */
export function freeRooms(allSessions, rooms, e) {
  const roomList = rooms.length
    ? rooms
    : [...new Set(allSessions.map((s) => s.room).filter(Boolean))].map((name) => ({ name }));
  const days = e.days.length ? e.days : DAYS;
  const hours = (e.hours.length ? e.hours : TEACHING_HOURS).filter((h) => inPeriod(h, e.period));
  const occupied = new Map();
  for (const s of allSessions) for (const h of sessionHours(s)) occupied.set(`${s.day}|${h}|${s.room}`, s);

  const wanted = (e.rooms.length ? roomList.filter((r) => e.rooms.includes(r.name)) : roomList)
    .filter((r) => !e.labsOnly || /lab/i.test(`${r.type ?? ''} ${r.name}`));
  const label = (r) => (r.capacity ? `${r.name} (${r.type ?? 'room'}, ${r.capacity} seats)` : r.name);

  // A whole-day question reads better per room: "A-101: free 8 AM, 2 PM".
  if (!e.hours.length && days.length === 1) {
    return wanted.map((r) => {
      const free = hours.filter((h) => !occupied.has(`${days[0]}|${h}|${r.name}`));
      const text = free.length === hours.length ? 'free all day' : free.length ? `free at ${free.map(fmtHour).join(', ')}` : 'fully booked';
      return `${days[0]} · ${label(r)}: ${text}`;
    });
  }

  const lines = [];
  // Asking about specific rooms: say free or who has it booked.
  if (e.rooms.length) {
    for (const day of days) for (const hour of hours) for (const r of wanted) {
      const booking = occupied.get(`${day}|${hour}|${r.name}`);
      lines.push(`${day} ${fmtHour(hour)} · ${r.name}: ${booking ? `booked (${booking.subjectName}, ${booking.section}, ${booking.faculty})` : 'free'}`);
    }
    return lines.slice(0, 60);
  }
  for (const day of days) {
    for (const hour of hours) {
      const free = wanted
        .filter((r) => !occupied.has(`${day}|${hour}|${r.name}`))
        .map(label);
      lines.push(`${day} ${fmtHour(hour)}: ${free.length ? free.slice(0, 15).join(', ') + (free.length > 15 ? ` … +${free.length - 15} more` : '') : 'no free room'}`);
    }
  }
  return lines.slice(0, 60);
}

/** Free teaching hours for the user's own scope (a faculty member or a section). */
export function freeSlots(scopedSessions, user, e) {
  const days = e.days.length ? e.days : DAYS;
  let hours = TEACHING_HOURS;
  if (user?.role === 'student') {
    const shift = scopedSessions.find((s) => s.shift)?.shift;
    if (SHIFT_HOURS[shift]) hours = SHIFT_HOURS[shift];
  }
  hours = hours.filter((h) => inPeriod(h, e.period) && (!e.hours.length || e.hours.includes(h)));
  const busy = new Set();
  for (const s of scopedSessions) for (const h of sessionHours(s)) busy.add(`${s.day}|${h}`);
  return days.map((day) => {
    const free = hours.filter((h) => !busy.has(`${day}|${h}`)).map(fmtHour);
    return `${day}: ${free.length ? free.join(', ') : 'no free hour'}`;
  });
}

function tally(sessions, key) {
  const totals = new Map();
  for (const s of sessions) {
    const name = s[key] || 'Unknown';
    totals.set(name, (totals.get(name) ?? 0) + (Number(s.duration) > 0 ? Number(s.duration) : 1));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

export function workloadSummary(sessions, user, e) {
  const scoped = filterSessions(sessions, e);
  const total = scoped.reduce((sum, s) => sum + (Number(s.duration) > 0 ? Number(s.duration) : 1), 0);
  const lines = [`Total scheduled hours: ${total} across ${scoped.length} sessions`];
  const fmt = (rows, limit) => rows.slice(0, limit).map(([name, hours]) => `${name} ${hours}h`).join(', ');
  const byDay = tally(scoped, 'day').sort((a, b) => DAYS.indexOf(a[0]) - DAYS.indexOf(b[0]));
  lines.push(`Hours by day: ${fmt(byDay, 6)}`);
  if (user?.role === 'admin' || user?.role === 'coordinator') {
    const byFaculty = tally(scoped, 'faculty');
    lines.push(`Faculty hours, highest first: ${fmt(byFaculty, 25)}`);
    if (byFaculty.length > 5) lines.push(`Lightest faculty loads: ${fmt([...byFaculty].reverse(), 5)}`);
    lines.push(`Room hours, busiest first: ${fmt(tally(scoped, 'room'), 20)}`);
    lines.push(`Department hours: ${fmt(tally(scoped, 'department'), 10)}`);
    lines.push(`Section hours: ${fmt(tally(scoped, 'section'), 30)}`);
  } else {
    lines.push(`Hours by subject: ${fmt(tally(scoped, 'subjectName'), 15)}`);
  }
  lines.push(`Lab hours: ${scoped.filter((s) => s.isLab).reduce((sum, s) => sum + (Number(s.duration) || 1), 0)}`);
  return lines;
}

/**
 * Build the grounded context for one question.
 * Returns { entities, matched, sections: [{ title, lines }], truncated }.
 */
const FOLLOW_UP = /^(and|also|what about|how about|then|same|ok|okay|and what about|what of)\b/i;

/** "What about Thursday?" keeps the subject/room/person from the previous question. */
export function isFollowUp(question) {
  return FOLLOW_UP.test(question.trim()) || question.trim().split(/\s+/).length <= 4;
}

export function mergeEntities(current, previous) {
  if (!previous) return current;
  const merged = { ...current };
  for (const key of ['days', 'subjects', 'rooms', 'faculty', 'sections']) {
    if (!merged[key].length) merged[key] = previous[key];
  }
  // A new day or time replaces the old time window instead of combining with it.
  if (!current.days.length && !current.hours.length && !current.period) {
    merged.hours = previous.hours;
    merged.period = previous.period;
  }
  merged.labsOnly = current.labsOnly || previous.labsOnly;
  return merged;
}

/** previousQuestions: earlier user questions, most recent first. */
export function buildContext({ intent, question, sessions, allSessions, rooms = [], user, previousQuestions = [] }) {
  const pool = sessions.length ? sessions : allSessions;
  let entities = extractEntities(question, pool);
  let current = question;
  for (const previous of previousQuestions) {
    if (!isFollowUp(current)) break;
    entities = mergeEntities(entities, extractEntities(previous, pool));
    current = previous;
  }
  const sections = [];
  let matched = [];
  let truncated = 0;

  if (intent === 'free') {
    const wantsRooms = /\b(room|rooms|lab|labs|hall|classroom|classrooms|venue)\b/i.test(question) || entities.rooms.length;
    if (wantsRooms || user?.role === 'admin' || user?.role === 'coordinator') {
      sections.push({ title: 'Free rooms (no class booked at that hour)', lines: freeRooms(allSessions, rooms, entities) });
    }
    if (user?.role === 'faculty' || user?.role === 'student') {
      sections.push({ title: `Free hours for ${user.role === 'student' ? `section ${user.section}` : 'you'}`, lines: freeSlots(sessions, user, entities) });
    }
  }

  if (intent === 'workload') {
    sections.push({ title: 'Workload and utilisation summary', lines: workloadSummary(sessions, user, { ...entities, hours: [], period: null }) });
  }

  if (intent !== 'free' && intent !== 'workload') {
    matched = sortSessions(filterSessions(sessions, entities));
    truncated = Math.max(0, matched.length - MAX_SESSION_LINES);
    sections.push({
      title: `Matching classes (${matched.length})`,
      lines: matched.slice(0, MAX_SESSION_LINES).map(describeSession).concat(truncated ? [`… ${truncated} more not shown`] : []),
    });
  }

  return { entities, matched, sections, truncated };
}

export function contextToText(sections) {
  return sections.map(({ title, lines }) => `## ${title}\n${lines.length ? lines.join('\n') : '(none)'}`).join('\n\n');
}
