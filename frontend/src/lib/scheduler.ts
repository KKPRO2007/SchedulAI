import type { Faculty, Room, Section, Subject } from './types';
import type { Assignment } from './import/detect';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

/**
 * Up to four academic shifts (synopsis §1). Each has five teaching hours.
 * 13:00 is lunch for every shift that spans midday.
 */
export const SHIFT_HOURS: Record<string, number[]> = {
  'Shift 1': [8, 9, 10, 11, 12],
  'Shift 2': [11, 12, 14, 15, 16],
  'Shift 3': [9, 10, 11, 12, 14],
  'Shift 4': [12, 14, 15, 16, 17],
};

export type Strategy = 'balanced' | 'compact' | 'preference';

export const STRATEGIES: Record<Strategy, { label: string; text: string }> = {
  balanced: { label: 'Balanced', text: 'Spreads each subject across the week and evens out daily load.' },
  compact: { label: 'Compact', text: 'Packs each section’s day tightly to reduce idle gaps.' },
  preference: { label: 'Preference-first', text: 'Places classes inside faculty preferred teaching windows first.' },
};

export type Session = {
  id: string;
  day: string;
  start: number;
  duration: number;
  section: string;
  shift: string;
  department: string;
  subjectCode: string;
  subjectName: string;
  faculty: string;
  facultyEmail: string;
  room: string;
  isLab: boolean;
  color: number;
};

export type Unscheduled = { section: string; subject: string; hours: number; reason: string };

export type Timetable = {
  generatedAt: string;
  seed: number;
  strategy?: Strategy;
  days: string[];
  sessions: Session[];
  unscheduled: Unscheduled[];
  stats: {
    requiredHours: number;
    scheduledHours: number;
    sections: number;
    facultyUsed: number;
    roomsUsed: number;
    roomUtilization: number;
    ms: number;
  };
  /** what the run was built from, for reproducibility (synopsis §7.2) */
  inputs?: { faculty: number; rooms: number; sections: number; subjects: number; restarts: number };
};

export type ScheduleInput = {
  faculty: Faculty[];
  rooms: Room[];
  sections: Section[];
  subjects: Subject[];
  assignments?: Assignment[];
  days?: number;
  maxFacultyLoad?: number;
  seed?: number;
  strategy?: Strategy;
  /** the published timetable, so a regeneration keeps stable placements where it can */
  previous?: Session[];
  /** randomised restarts kept if they place more hours */
  restarts?: number;
};

export const isLabSubject = (s: { name: string }) => /\blab\b|laboratory|practical|workshop|project/i.test(s.name);

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rand: () => number) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.trim().toLowerCase();
export const inWindow = (window: string | undefined, start: number) => (window === 'morning' ? start < 13 : window === 'afternoon' ? start >= 13 : true);

/**
 * Hard constraints are never broken: a section, teacher or room is used once per hour,
 * rooms fit the section, labs go to labs, shifts and availability are respected.
 * Search: most-constrained activities first, scored slot ordering, and randomised restarts.
 */
export function generateTimetable(input: ScheduleInput): Timetable {
  const t0 = performance.now();
  const baseSeed = input.seed ?? Math.floor(Math.random() * 1e9);
  const restarts = Math.max(1, input.restarts ?? 4);
  let best: Timetable | null = null;
  for (let r = 0; r < restarts; r++) {
    const tt = solveOnce(input, baseSeed + r * 7919);
    if (!best || tt.stats.scheduledHours > best.stats.scheduledHours) best = tt;
    if (best.unscheduled.every((u) => u.hours === 0)) break;
  }
  best!.stats.ms = performance.now() - t0;
  best!.seed = baseSeed;
  best!.inputs = { faculty: input.faculty.length, rooms: input.rooms.length, sections: input.sections.length, subjects: input.subjects.length, restarts };
  return best!;
}

function solveOnce(input: ScheduleInput, seed: number): Timetable {
  const rand = rng(seed);
  const strategy: Strategy = input.strategy ?? 'balanced';
  const days = DAYS.slice(0, input.days ?? 5);
  const defaultMax = input.maxFacultyLoad ?? 18;

  const busy = new Set<string>();
  const isFree = (kind: string, id: string | number, day: string, hour: number) => !busy.has(`${kind}|${id}|${day}|${hour}`);
  const take = (kind: string, id: string | number, day: string, hour: number) => busy.add(`${kind}|${id}|${day}|${hour}`);

  const facultyLoad = new Map<number, number>();
  const maxFor = (f: Faculty) => f.maxWorkload ?? defaultMax;
  const facultyByEmail = new Map(input.faculty.map((f) => [norm(f.email), f]));
  const facultyByName = new Map(input.faculty.map((f) => [norm(f.name), f]));
  const availableFaculty = input.faculty.filter((f) => f.available);
  const rooms = input.rooms.filter((r) => r.available).sort((a, b) => a.capacity - b.capacity);

  // previous placements keyed by section|subject for stability
  const previous = new Map<string, Session[]>();
  for (const s of input.previous ?? []) {
    const k = `${norm(s.section)}|${norm(s.subjectCode)}`;
    previous.set(k, [...(previous.get(k) ?? []), s]);
  }

  const pinned = new Map<string, Faculty>();
  for (const a of input.assignments ?? []) {
    if (!a.faculty) continue;
    const f = facultyByEmail.get(norm(a.faculty)) ?? facultyByName.get(norm(a.faculty));
    if (f) pinned.set(`${norm(a.section ?? '*')}|${norm(a.subject)}`, f);
  }
  // keep last published teacher assignments too
  for (const [k, list] of previous) {
    const f = facultyByEmail.get(norm(list[0].facultyEmail));
    if (f && f.available && !pinned.has(k)) pinned.set(k, f);
  }

  type Job = { section: Section; subject: Subject; lab: boolean; hours: number; faculty?: Faculty };
  const jobs: Job[] = [];
  const unscheduled: Unscheduled[] = [];
  const colorOf = new Map<string, number>();

  for (const section of input.sections) {
    const list = input.subjects.filter((s) => norm(s.department) === norm(section.department) && s.semester === section.semester);
    if (list.length === 0) {
      unscheduled.push({ section: section.name, subject: '—', hours: 0, reason: `No subjects for ${section.department} semester ${section.semester}` });
      continue;
    }
    for (const subject of list) {
      if (!colorOf.has(subject.code)) colorOf.set(subject.code, colorOf.size);
      jobs.push({ section, subject, lab: isLabSubject(subject), hours: subject.weeklyHours });
    }
  }

  // Most constrained first: labs (2 contiguous hours + a lab room), heavier subjects, larger sections.
  jobs.sort((a, b) => Number(b.lab) - Number(a.lab) || b.hours - a.hours || b.section.students - a.section.students || rand() - 0.5);

  for (const job of jobs) {
    const key = `${norm(job.section.name)}|${norm(job.subject.code)}`;
    const fixed = pinned.get(key) ?? pinned.get(`*|${norm(job.subject.code)}`);
    if (fixed && (facultyLoad.get(fixed.id) ?? 0) + job.hours <= maxFor(fixed)) {
      job.faculty = fixed;
      facultyLoad.set(fixed.id, (facultyLoad.get(fixed.id) ?? 0) + job.hours);
      continue;
    }
    const fits = (f: Faculty) => (facultyLoad.get(f.id) ?? 0) + job.hours <= maxFor(f);
    const sameDept = availableFaculty.filter((f) => norm(f.department) === norm(job.section.department));
    // Prefer the section's own department; borrow only when it is fully loaded.
    let pool = sameDept.filter(fits);
    if (pool.length === 0) pool = availableFaculty.filter(fits);
    const pick = pool.sort((a, b) => (facultyLoad.get(a.id) ?? 0) / maxFor(a) - (facultyLoad.get(b.id) ?? 0) / maxFor(b) || rand() - 0.5)[0];
    if (pick) {
      job.faculty = pick;
      facultyLoad.set(pick.id, (facultyLoad.get(pick.id) ?? 0) + job.hours);
    }
  }

  const sectionLoad = new Map<number, number>();
  jobs.forEach((j) => sectionLoad.set(j.section.id, (sectionLoad.get(j.section.id) ?? 0) + (j.lab ? Math.max(1, Math.round(j.hours / 2)) * 2 : j.hours)));

  const sessions: Session[] = [];
  const sectionDayCount = new Map<string, number>();

  for (const job of jobs) {
    const { section, subject, lab } = job;
    if (!job.faculty) {
      unscheduled.push({ section: section.name, subject: subject.name, hours: job.hours, reason: 'No available faculty under workload limit' });
      continue;
    }
    const f = job.faculty;
    const hours = SHIFT_HOURS[section.shift] ?? SHIFT_HOURS['Shift 1'];
    const block = lab ? 2 : 1;
    const needed = lab ? Math.max(1, Math.round(job.hours / 2)) : job.hours;
    const minCap = lab ? Math.ceil(section.students / 2) : section.students;
    const roomPool = rooms.filter((r) => (lab ? r.type === 'Laboratory' : r.type !== 'Laboratory') && r.capacity >= minCap);
    const fallbackRooms = lab ? [] : rooms.filter((r) => r.type !== 'Laboratory');
    const prev = previous.get(`${norm(section.name)}|${norm(subject.code)}`) ?? [];
    let placed = 0;
    const usedDays = new Set<string>();

    const slotScore = (day: string, start: number) => {
      let s = rand() * 0.4;
      if (prev.some((p) => p.day === day && p.start === start)) s += strategy === 'balanced' ? 2.5 : 1.2;
      const pref = inWindow(f.preferredWindow, start) ? 1 : 0;
      s += pref * (strategy === 'preference' ? 2.5 : 0.6);
      const adjacent = !isFree('sec', section.id, day, start - 1) || !isFree('sec', section.id, day, start + block);
      if (adjacent) s += strategy === 'compact' ? 2 : 0.4;
      if (strategy === 'compact') s += (hours.length - hours.indexOf(start)) * 0.1;
      return s;
    };

    for (let attempt = 0; attempt < 2 && placed < needed; attempt++) {
      const dayOrder = shuffle(days, rand).sort((a, b) => {
        const pa = prev.some((p) => p.day === a) ? -2 : 0;
        const pb = prev.some((p) => p.day === b) ? -2 : 0;
        return pa - pb || (sectionDayCount.get(`${section.name}|${a}`) ?? 0) - (sectionDayCount.get(`${section.name}|${b}`) ?? 0);
      });
      for (const day of dayOrder) {
        if (placed >= needed) break;
        if (attempt === 0 && usedDays.has(day)) continue;
        const starts = hours.filter((h) => Array.from({ length: block }, (_, k) => h + k).every((x) => hours.includes(x))).sort((a, b) => slotScore(day, b) - slotScore(day, a));
        for (const start of starts) {
          const span = Array.from({ length: block }, (_, k) => start + k);
          if (!span.every((h) => isFree('sec', section.id, day, h) && isFree('fac', f.id, day, h))) continue;
          const room = (roomPool.length ? roomPool : fallbackRooms).find((r) => span.every((h) => isFree('room', r.id, day, h)));
          if (!room) continue;
          span.forEach((h) => {
            take('sec', section.id, day, h);
            take('fac', f.id, day, h);
            take('room', room.id, day, h);
          });
          sessions.push({
            id: `${section.id}-${subject.id}-${day}-${start}`,
            day,
            start,
            duration: block,
            section: section.name,
            shift: section.shift,
            department: section.department,
            subjectCode: subject.code,
            subjectName: subject.name,
            faculty: f.name,
            facultyEmail: f.email,
            room: room.name,
            isLab: lab,
            color: colorOf.get(subject.code) ?? 0,
          });
          sectionDayCount.set(`${section.name}|${day}`, (sectionDayCount.get(`${section.name}|${day}`) ?? 0) + block);
          usedDays.add(day);
          placed++;
          break;
        }
      }
    }
    if (placed < needed) {
      const load = sectionLoad.get(section.id) ?? 0;
      const capacity = days.length * hours.length;
      const reason =
        roomPool.length === 0 && lab
          ? 'No laboratory large enough'
          : load > capacity
            ? `Section needs ${load}h a week but ${section.shift} only has ${capacity}h`
            : 'No common free slot for section, faculty and room';
      unscheduled.push({ section: section.name, subject: subject.name, hours: (needed - placed) * block, reason });
    }
  }

  const requiredHours = jobs.reduce((a, j) => a + (j.lab ? Math.max(1, Math.round(j.hours / 2)) * 2 : j.hours), 0);
  const scheduledHours = sessions.reduce((a, s) => a + s.duration, 0);
  const totalRoomSlots = rooms.length * days.length * HOURS.length || 1;

  return {
    generatedAt: new Date().toISOString(),
    seed,
    strategy,
    days,
    sessions: sessions.sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.start - b.start),
    unscheduled,
    stats: {
      requiredHours,
      scheduledHours,
      sections: new Set(sessions.map((s) => s.section)).size,
      facultyUsed: new Set(sessions.map((s) => s.facultyEmail)).size,
      roomsUsed: new Set(sessions.map((s) => s.room)).size,
      roomUtilization: scheduledHours / totalRoomSlots,
      ms: 0,
    },
  };
}

const AS_KEY = 'schedulai.assignments.v2';

/** Teaching allocations read from imported files (section + subject → teacher). */
export function saveAssignments(list: Assignment[]) {
  const existing = loadAssignments();
  const sig = (a: Assignment) => `${a.section}|${a.subject}`;
  const merged = new Map(existing.map((a) => [sig(a), a]));
  list.forEach((a) => merged.set(sig(a), a));
  try {
    localStorage.setItem(AS_KEY, JSON.stringify([...merged.values()]));
  } catch {
    /* ignore */
  }
}

export function loadAssignments(): Assignment[] {
  try {
    return JSON.parse(localStorage.getItem(AS_KEY) ?? '[]') as Assignment[];
  } catch {
    return [];
  }
}

export function clearAssignments() {
  localStorage.removeItem(AS_KEY);
}

export const fmtHour = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;
