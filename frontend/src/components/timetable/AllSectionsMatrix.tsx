import { useMemo, useState } from 'react';
import { fmtHour, HOURS, type Session } from '../../lib/scheduler';
import { swatchStyle } from '../../lib/timetableStyle';

const abbr = (name: string) =>
  name
    .replace(/&/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-Z]{2,}$/.test(w))
    .map((w) => (/^[A-Z]{2,}$/.test(w) ? w : w[0].toUpperCase()))
    .join('')
    .slice(0, 3);

/** Every section on one screen: rows are sections, columns are day × hour. */
export default function AllSectionsMatrix({ sessions, days, onPick }: { sessions: Session[]; days: string[]; onPick: (section: string) => void }) {
  const [hover, setHover] = useState<{ s: Session; x: number; y: number } | null>(null);

  const groups = useMemo(() => {
    const bySection = new Map<string, { dept: string; shift: string; cells: Map<string, Session>; hours: number }>();
    for (const s of sessions) {
      const g = bySection.get(s.section) ?? { dept: s.department, shift: s.shift, cells: new Map(), hours: 0 };
      for (let k = 0; k < s.duration; k++) g.cells.set(`${s.day}|${s.start + k}`, s);
      g.hours += s.duration;
      bySection.set(s.section, g);
    }
    const byDept = new Map<string, [string, typeof bySection extends Map<string, infer V> ? V : never][]>();
    [...bySection.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .forEach(([name, g]) => byDept.set(g.dept, [...(byDept.get(g.dept) ?? []), [name, g]]));
    return [...byDept.entries()];
  }, [sessions]);

  const CELL = 26;

  return (
    <div className="relative overflow-x-auto" onMouseLeave={() => setHover(null)}>
      <table className="border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 bg-[#0e1226] px-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Section</th>
            {days.map((d) => (
              <th key={d} colSpan={HOURS.length} className="border-l border-white/10 px-1 pb-1 text-center text-xs font-semibold text-[var(--text-primary)]">
                {d}
              </th>
            ))}
            <th className="px-3 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">Hours</th>
          </tr>
          <tr>
            <th className="sticky left-0 z-20 bg-[#0e1226]" />
            {days.map((d) =>
              HOURS.map((h, i) => (
                <th key={d + h} className={`pb-2 text-center text-[9px] font-medium text-[var(--text-muted)] ${i === 0 ? 'border-l border-white/10' : ''}`} style={{ width: CELL }}>
                  {h > 12 ? h - 12 : h}
                </th>
              ))
            )}
            <th />
          </tr>
        </thead>
        <tbody>
          {groups.map(([dept, rows]) => (
            <FragmentRows key={dept} dept={dept} span={days.length * HOURS.length + 2}>
              {rows.map(([name, g]) => (
                <tr key={name} className="group">
                  <td className="sticky left-0 z-10 bg-[#0e1226] py-[2px] pr-3">
                    <button onClick={() => onPick(name)} className="flex w-32 items-center gap-2 rounded-lg px-2 py-1 text-left transition group-hover:bg-white/[0.06]">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{name}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">{g.shift === 'Shift 2' ? 'S2' : 'S1'}</span>
                    </button>
                  </td>
                  {days.map((d) =>
                    HOURS.map((h, i) => {
                      const s = g.cells.get(`${d}|${h}`);
                      return (
                        <td key={d + h} className={`p-[2px] ${i === 0 ? 'border-l border-white/10 pl-1' : ''}`}>
                          {s ? (
                            <button
                              onClick={() => onPick(name)}
                              onMouseEnter={(e) => {
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setHover({ s, x: r.left + r.width / 2, y: r.top });
                              }}
                              className="flex items-center justify-center rounded-[5px] text-[8.5px] font-bold text-white transition hover:scale-125 hover:ring-2 hover:ring-white/10"
                              style={{ width: CELL - 4, height: CELL - 4, ...swatchStyle(s.color) }}
                              aria-label={`${name} ${d} ${fmtHour(h)}: ${s.subjectName}`}
                            >
                              {s.isLab ? 'L' : abbr(s.subjectName)}
                            </button>
                          ) : (
                            <span className="block rounded-[5px] bg-white/[0.03]" style={{ width: CELL - 4, height: CELL - 4, opacity: h === 13 ? 0.4 : 1 }} />
                          )}
                        </td>
                      );
                    })
                  )}
                  <td className="px-3 text-right text-xs tabular-nums text-[var(--text-secondary)]">{g.hours}h</td>
                </tr>
              ))}
            </FragmentRows>
          ))}
        </tbody>
      </table>
      {hover && (
        <div className="glass-strong pointer-events-none fixed z-50 w-60 -translate-x-1/2 -translate-y-full rounded-2xl p-3 text-xs shadow-lg" style={{ left: hover.x, top: hover.y - 8 }}>
          <p className="font-semibold text-[var(--text-primary)]">{hover.s.subjectName}</p>
          <p className="mt-1 text-[var(--text-secondary)]">
            {hover.s.day} · {fmtHour(hover.s.start)}–{fmtHour(hover.s.start + hover.s.duration)}
          </p>
          <p className="text-[var(--text-muted)]">
            {hover.s.faculty} · {hover.s.room}
          </p>
        </div>
      )}
    </div>
  );
}

function FragmentRows({ dept, span, children }: { dept: string; span: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={span} className="sticky left-0 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-300">
          {dept}
        </td>
      </tr>
      {children}
    </>
  );
}
