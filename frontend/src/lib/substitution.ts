import type { Faculty } from './types';
import { inWindow, type Session } from './scheduler';

/**
 * Ranked substitutes for an absent teacher (synopsis §8.3):
 * must be available and free in that hour; ranked by subject competency,
 * same department, spare workload and preferred window.
 */
export type Candidate = { faculty: Faculty; score: number; reasons: string[] };

export function rankSubstitutes(session: Session, sessions: Session[], faculty: Faculty[], absentEmail: string): Candidate[] {
  const hours = Array.from({ length: session.duration }, (_, k) => session.start + k);
  const busy = new Set<string>();
  const load = new Map<string, number>();
  const teaches = new Map<string, Set<string>>();
  for (const s of sessions) {
    const e = s.facultyEmail.toLowerCase();
    for (let k = 0; k < s.duration; k++) busy.add(`${e}|${s.day}|${s.start + k}`);
    load.set(e, (load.get(e) ?? 0) + s.duration);
    teaches.set(e, (teaches.get(e) ?? new Set()).add(s.subjectCode));
  }

  return faculty
    .filter((f) => f.available && f.email.toLowerCase() !== absentEmail.toLowerCase())
    .filter((f) => hours.every((h) => !busy.has(`${f.email.toLowerCase()}|${session.day}|${h}`)))
    .map((f) => {
      const e = f.email.toLowerCase();
      const reasons: string[] = [];
      let score = 0;
      if (teaches.get(e)?.has(session.subjectCode)) {
        score += 40;
        reasons.push('already teaches this subject');
      }
      if (f.department === session.department) {
        score += 25;
        reasons.push('same department');
      }
      const used = load.get(e) ?? 0;
      const max = f.maxWorkload ?? 18;
      const spare = max - used - session.duration;
      if (spare < 0) {
        score -= 30;
        reasons.push(`would exceed ${max}h limit`);
      } else {
        score += Math.min(20, spare * 2);
        reasons.push(`${used}h of ${max}h used`);
      }
      if (f.preferredWindow && f.preferredWindow !== 'any') {
        if (inWindow(f.preferredWindow, session.start)) {
          score += 10;
          reasons.push(`prefers ${f.preferredWindow}s`);
        } else {
          score -= 5;
          reasons.push(`outside preferred ${f.preferredWindow}`);
        }
      }
      return { faculty: f, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
