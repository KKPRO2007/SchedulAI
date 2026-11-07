import type { Faculty, Room, ScoreComponent, ScoreReport, Section } from './types';
import { inWindow, SHIFT_HOURS, type Session, type Timetable } from './scheduler';

/**
 * Soft-constraint scoring (synopsis §7.1):
 * Score = 0.30 × workload balance + 0.20 × preference satisfaction + 0.20 × room utilisation
 *       + 0.15 × compactness + 0.15 × stability
 * Hard constraints (§8.1) are checked separately; a candidate that breaks one is never ranked.
 */

export type Weights = { workload: number; preference: number; rooms: number; compactness: number; stability: number };

export const DEFAULT_WEIGHTS: Weights = { workload: 0.3, preference: 0.2, rooms: 0.2, compactness: 0.15, stability: 0.15 };

export const WEIGHT_LABEL: Record<keyof Weights, string> = {
  workload: 'Workload balance',
  preference: 'Preference satisfaction',
  rooms: 'Room utilisation',
  compactness: 'Compactness',
  stability: 'Stability',
};

const WEIGHT_KEY = 'schedulai.weights.v1';
export function loadWeights(): Weights {
  try {
    return { ...DEFAULT_WEIGHTS, ...(JSON.parse(localStorage.getItem(WEIGHT_KEY) ?? '{}') as Partial<Weights>) };
  } catch {
    return DEFAULT_WEIGHTS;
  }
}
export function saveWeights(w: Weights) {
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(w));
}

export type HardCheck = { key: string; label: string; passed: boolean; violations: string[] };

/** The seven hard constraints from §8.1, each with the offending entries. */
export function checkHardConstraints(tt: Timetable, ctx: { faculty: Faculty[]; rooms: Room[]; sections: Section[] }): HardCheck[] {
  const v = { faculty: [] as string[], section: [] as string[], room: [] as string[], capacity: [] as string[], labs: [] as string[], availability: [] as string[], hours: [] as string[] };
  const seen = new Map<string, Session>();
  const roomBy = new Map(ctx.rooms.map((r) => [r.name, r]));
  const secBy = new Map(ctx.sections.map((s) => [s.name, s]));
  const facBy = new Map(ctx.faculty.map((f) => [f.email.toLowerCase(), f]));

  for (const s of tt.sessions) {
    for (let k = 0; k < s.duration; k++) {
      const h = s.start + k;
      for (const [kind, id, bucket] of [
        ['f', s.facultyEmail, v.faculty],
        ['s', s.section, v.section],
        ['r', s.room, v.room],
      ] as const) {
        const key = `${kind}|${id}|${s.day}|${h}`;
        const other = seen.get(key);
        if (other && other.id !== s.id) bucket.push(`${id} on ${s.day} at ${h}:00 (${other.subjectName} and ${s.subjectName})`);
        else seen.set(key, s);
      }
    }
    const room = roomBy.get(s.room);
    const sec = secBy.get(s.section);
    if (room && sec) {
      const need = s.isLab ? Math.ceil(sec.students / 2) : sec.students;
      if (room.capacity < need) v.capacity.push(`${s.section} (${sec.students}) in ${room.name} (${room.capacity} seats)`);
      if (s.isLab && room.type !== 'Laboratory') v.labs.push(`${s.subjectName} for ${s.section} in non-lab room ${room.name}`);
      if (!room.available) v.availability.push(`Room ${room.name} is marked unavailable`);
    }
    const f = facBy.get(s.facultyEmail.toLowerCase());
    if (f && !f.available) v.availability.push(`${f.name} is marked unavailable`);
    const shiftHours = SHIFT_HOURS[s.shift];
    if (shiftHours && !Array.from({ length: s.duration }, (_, k) => s.start + k).every((h) => shiftHours.includes(h))) {
      v.availability.push(`${s.section} placed outside ${s.shift} on ${s.day} at ${s.start}:00`);
    }
  }
  for (const u of tt.unscheduled) if (u.hours > 0) v.hours.push(`${u.section} · ${u.subject}: ${u.hours}h missing (${u.reason})`);

  const mk = (key: string, label: string, list: string[]): HardCheck => ({ key, label, passed: list.length === 0, violations: [...new Set(list)].slice(0, 12) });
  return [
    mk('faculty', 'No teacher in two places at once', v.faculty),
    mk('section', 'No section in two classes at once', v.section),
    mk('room', 'No room double-booked', v.room),
    mk('capacity', 'Room capacity fits the section', v.capacity),
    mk('labs', 'Labs only in laboratories', v.labs),
    mk('availability', 'Availability and shift boundaries honoured', v.availability),
    mk('hours', 'Every required weekly hour placed', v.hours),
  ];
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function scoreTimetable(
  tt: Timetable,
  ctx: { faculty: Faculty[]; rooms: Room[]; sections: Section[]; previous?: Session[] },
  weights: Weights = DEFAULT_WEIGHTS
): ScoreReport {
  const hard = checkHardConstraints(tt, ctx);

  // Workload balance: 1 − coefficient of variation of load relative to each teacher's limit.
  const load = new Map<string, number>();
  tt.sessions.forEach((s) => load.set(s.facultyEmail, (load.get(s.facultyEmail) ?? 0) + s.duration));
  const facBy = new Map(ctx.faculty.map((f) => [f.email.toLowerCase(), f]));
  const ratios = [...load.entries()].map(([e, h]) => h / (facBy.get(e.toLowerCase())?.maxWorkload ?? 18));
  const mean = ratios.reduce((a, b) => a + b, 0) / (ratios.length || 1);
  const sd = Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / (ratios.length || 1));
  const workload = clamp(1 - (mean ? sd / mean : 0));
  const maxLoad = Math.max(0, ...load.values());
  const minLoad = Math.min(...(load.size ? load.values() : [0]));

  // Preference satisfaction: share of teaching hours inside each teacher's preferred window.
  let prefHours = 0;
  let prefTotal = 0;
  for (const s of tt.sessions) {
    const w = facBy.get(s.facultyEmail.toLowerCase())?.preferredWindow;
    if (!w || w === 'any') continue;
    prefTotal += s.duration;
    if (inWindow(w, s.start)) prefHours += s.duration;
  }
  const preference = prefTotal ? prefHours / prefTotal : 1;

  // Room utilisation: how well section size fills the room it was given.
  const roomBy = new Map(ctx.rooms.map((r) => [r.name, r]));
  const secBy = new Map(ctx.sections.map((s) => [s.name, s]));
  const fits = tt.sessions
    .map((s) => {
      const r = roomBy.get(s.room);
      const sec = secBy.get(s.section);
      if (!r || !sec) return null;
      const need = s.isLab ? Math.ceil(sec.students / 2) : sec.students;
      return clamp(need / r.capacity);
    })
    .filter((x): x is number => x !== null);
  const rooms = fits.length ? fits.reduce((a, b) => a + b, 0) / fits.length : 0;

  // Compactness: 1 − idle gap hours / span hours per section-day.
  let gaps = 0;
  let span = 0;
  const byDay = new Map<string, number[]>();
  tt.sessions.forEach((s) => {
    const k = `${s.section}|${s.day}`;
    const list = byDay.get(k) ?? [];
    for (let i = 0; i < s.duration; i++) list.push(s.start + i);
    byDay.set(k, list);
  });
  byDay.forEach((hours, k) => {
    const shift = SHIFT_HOURS[tt.sessions.find((s) => `${s.section}|${s.day}` === k)?.shift ?? 'Shift 1'] ?? [];
    const sorted = [...new Set(hours)].sort((a, b) => a - b);
    const teachable = shift.filter((h) => h >= sorted[0] && h <= sorted[sorted.length - 1]);
    span += teachable.length;
    gaps += teachable.length - sorted.length;
  });
  const compactness = span ? clamp(1 - gaps / span) : 1;

  // Stability: share of previously published placements kept unchanged.
  const prev = ctx.previous ?? [];
  const now = new Set(tt.sessions.map((s) => `${s.section}|${s.subjectCode}|${s.day}|${s.start}|${s.facultyEmail}`));
  const kept = prev.filter((s) => now.has(`${s.section}|${s.subjectCode}|${s.day}|${s.start}|${s.facultyEmail}`)).length;
  const stability = prev.length ? kept / prev.length : 1;

  const components: ScoreComponent[] = [
    { key: 'workload', label: WEIGHT_LABEL.workload, weight: weights.workload, value: workload, note: `Teaching loads range ${minLoad}–${maxLoad}h; spread ${pct(1 - workload)} around the mean` },
    { key: 'preference', label: WEIGHT_LABEL.preference, weight: weights.preference, value: preference, note: prefTotal ? `${prefHours} of ${prefTotal} hours fall in teachers’ preferred windows` : 'No teacher has set a preferred window' },
    { key: 'rooms', label: WEIGHT_LABEL.rooms, weight: weights.rooms, value: rooms, note: `Sections fill ${pct(rooms)} of their room’s seats on average` },
    { key: 'compactness', label: WEIGHT_LABEL.compactness, weight: weights.compactness, value: compactness, note: `${gaps} idle gap hour${gaps === 1 ? '' : 's'} across all section-days` },
    { key: 'stability', label: WEIGHT_LABEL.stability, weight: weights.stability, value: stability, note: prev.length ? `${kept} of ${prev.length} published placements kept` : 'No published version to compare against' },
  ];
  const wsum = components.reduce((a, c) => a + c.weight, 0) || 1;
  const total = components.reduce((a, c) => a + c.weight * c.value, 0) / wsum;
  return { total, components, hardPassed: hard.filter((h) => h.passed).length, hardTotal: hard.length, strategy: tt.strategy };
}
