import type { Faculty, Room, Section, Subject } from './types';
import type { Assignment } from './import/detect';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

/** Shift 1 runs mornings, Shift 2 runs late morning to evening; 13:00 is lunch for Shift 1 only. */
export const SHIFT_HOURS: Record<string, number[]> = {
  'Shift 1': [8, 9, 10, 11, 12],
  'Shift 2': [11, 12, 14, 15, 16],
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
};

const isLabSubject = (s: Subject) => /\blab\b|laboratory|practical|workshop|project/i.test(s.name);

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

export function generateTimetable(input: ScheduleInput): Timetable {
  const t0 = performance.now();
  const seed = input.seed ?? Math.floor(Math.random() * 1e9);
  const rand = rng(seed);
  const days = DAYS.slice(0, input.days ?? 5);
  const maxLoad = input.maxFacultyLoad ?? 18;

  const busy = new Set<string>(); // `${kind}|${id}|${day}|${hour}`
  const isFree = (kind: string, id: string | number, day: string, hour: number) => !busy.has(`${kind}|${id}|${day}|${hour}`);
  const take = (kind: string, id: string | number, day: string, hour: number) => busy.add(`${kind}|${id}|${day}|${hour}`);

  const facultyLoad = new Map<number, number>();
  const facultyByEmail = new Map(input.faculty.map((f) => [norm(f.email), f]));
  const facultyByName = new Map(input.faculty.map((f) => [norm(f.name), f]));
  const availableFaculty = input.faculty.filter((f) => f.available);
  const rooms = input.rooms.filter((r) => r.available).sort((a, b) => a.capacity - b.capacity);

  const pinned = new Map<string, Faculty>();
  for (const a of input.assignments ?? []) {
    if (!a.faculty) continue;
    const f = facultyByEmail.get(norm(a.faculty)) ?? facultyByName.get(norm(a.faculty));
    if (f) pinned.set(`${norm(a.section ?? '*')}|${norm(a.subject)}`, f);
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

  const sectionLoad = new Map<number, number>();
  jobs.forEach((j) => sectionLoad.set(j.section.id, (sectionLoad.get(j.section.id) ?? 0) + (j.lab ? Math.max(1, Math.round(j.hours / 2)) * 2 : j.hours)));

  // Hardest first: labs (need 2 contiguous hours + a lab room), then heavier subjects, big sections.
  jobs.sort((a, b) => Number(b.lab) - Number(a.lab) || b.hours - a.hours || b.section.students - a.section.students || rand() - 0.5);

  // Choose one teacher per (section, subject) up front so the same person teaches every session.
  for (const job of jobs) {
    const key = `${norm(job.section.name)}|${norm(job.subject.code)}`;
    const fixed = pinned.get(key) ?? pinned.get(`*|${norm(job.subject.code)}`);
    if (fixed) {
      job.faculty = fixed;
      facultyLoad.set(fixed.id, (facultyLoad.get(fixed.id) ?? 0) + job.hours);
      continue;
    }
    const sameDept = availableFaculty.filter((f) => norm(f.department) === norm(job.section.department));
    const fits = (f: Faculty) => (facultyLoad.get(f.id) ?? 0) + job.hours <= maxLoad;
    // Prefer the section's own department; borrow from other departments only when it is fully loaded.
    let pool = sameDept.filter(fits);
    if (pool.length === 0) pool = availableFaculty.filter(fits);
    const pick = pool.sort((a, b) => (facultyLoad.get(a.id) ?? 0) - (facultyLoad.get(b.id) ?? 0) || rand() - 0.5)[0];
    if (pick) {
      job.faculty = pick;
      facultyLoad.set(pick.id, (facultyLoad.get(pick.id) ?? 0) + job.hours);
    }
  }

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
    let placed = 0;
    const usedDays = new Set<string>();

    // Spread across days: prefer days without this subject and with fewer classes for the section.
    for (let attempt = 0; attempt < 2 && placed < needed; attempt++) {
      const dayOrder = shuffle(days, rand).sort(
        (a, b) => (sectionDayCount.get(`${section.name}|${a}`) ?? 0) - (sectionDayCount.get(`${section.name}|${b}`) ?? 0)
      );
      for (const day of dayOrder) {
        if (placed >= needed) break;
        if (attempt === 0 && usedDays.has(day)) continue;
        for (const start of shuffle(hours, rand)) {
          const span = Array.from({ length: block }, (_, k) => start + k);
          if (!span.every((h) => hours.includes(h))) continue;
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
  const roomsUsed = new Set(sessions.map((s) => s.room)).size;
  const totalRoomSlots = rooms.length * days.length * HOURS.length || 1;

  return {
    generatedAt: new Date().toISOString(),
    seed,
    days,
    sessions: sessions.sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.start - b.start),
    unscheduled,
    stats: {
      requiredHours,
      scheduledHours,
      sections: new Set(sessions.map((s) => s.section)).size,
      facultyUsed: new Set(sessions.map((s) => s.facultyEmail)).size,
      roomsUsed,
      roomUtilization: scheduledHours / totalRoomSlots,
      ms: performance.now() - t0,
    },
  };
}

const TT_KEY = 'schedulai.timetable.v2';
const AS_KEY = 'schedulai.assignments.v2';

export function clearTimetable() {
  localStorage.removeItem(TT_KEY);
  localStorage.removeItem(AS_KEY);
}

export function saveTimetable(t: Timetable) {
  try {
    localStorage.setItem(TT_KEY, JSON.stringify(t));
  } catch {
    /* ignore quota */
  }
}

export function loadTimetable(): Timetable | null {
  try {
    const raw = localStorage.getItem(TT_KEY);
    return raw ? (JSON.parse(raw) as Timetable) : null;
  } catch {
    return null;
  }
}

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

export const fmtHour = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;
