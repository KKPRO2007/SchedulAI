import { useEffect, useState } from 'react';
import { Coffee, DoorOpen, FlaskConical, GraduationCap, UserRound } from 'lucide-react';
import { fmtHour, HOURS, type Session } from '../../lib/scheduler';
import { dateOf } from '../../lib/exportTimetable';
import { sessionStyle } from '../../lib/timetableStyle';

export type GridPerspective = 'section' | 'faculty' | 'room';

const ROW_H = 78;

/** Weekly grid for one section / faculty member / room. Labs span two rows. */
export default function TimetableGrid({
  sessions,
  days,
  perspective,
  iso = false,
  onSelect,
  title,
}: {
  sessions: Session[];
  days: string[];
  perspective: GridPerspective;
  /** tilted isometric 3D view */
  iso?: boolean;
  onSelect?: (s: Session) => void;
  title?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const todayCol = days.indexOf(todayName);
  const hourFloat = now.getHours() + now.getMinutes() / 60;
  const showNow = todayCol >= 0 && hourFloat >= HOURS[0] && hourFloat < HOURS[HOURS.length - 1] + 1;
  const lunchRow = HOURS.indexOf(13);
  const hasShift1 = sessions.some((s) => s.shift === 'Shift 1') || sessions.length === 0;

  return (
    <>
    <AgendaView sessions={sessions} days={days} perspective={perspective} onSelect={onSelect} todayName={todayName} />
    <div className="hidden overflow-x-auto sm:block print:block" style={{ perspective: '1800px' }}>
      {title && <p className="print-only mb-3 text-lg font-bold">{title}</p>}
      <div
        className="preserve-3d mx-auto min-w-[880px] transition-transform duration-1000 ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{ transform: iso ? 'rotateX(48deg) rotateZ(-22deg) scale(0.82) translateY(-40px)' : 'none' }}
      >
        <div className="preserve-3d relative grid gap-1" style={{ gridTemplateColumns: `92px repeat(${days.length}, minmax(0, 1fr))`, gridTemplateRows: `56px repeat(${HOURS.length}, ${ROW_H}px)` }}>
          <div />
          {days.map((d, i) => {
            const isToday = i === todayCol;
            const date = dateOf(d);
            return (
              <div
                key={d}
                className={`flex flex-col items-center justify-center rounded-md border text-center ${isToday ? 'border-brand-400/50 bg-brand-400/10' : 'border-[var(--line)] bg-white/[0.03]'}`}
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                <span className="text-sm font-semibold text-[var(--text-primary)]">{d}</span>
                <span className={`text-[10.5px] ${isToday ? 'text-brand-300' : 'text-[var(--text-muted)]'}`}>
                  {date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  {isToday && ' · Today'}
                </span>
              </div>
            );
          })}

          {HOURS.map((h, r) => (
            <div key={h} className="flex flex-col items-end pr-3 pt-1.5" style={{ gridColumn: 1, gridRow: r + 2 }}>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{fmtHour(h)}</span>
              <span className="text-[10px] text-[var(--text-muted)]">to {fmtHour(h + 1)}</span>
            </div>
          ))}

          {days.map((d, c) =>
            HOURS.map((h, r) => (
              <div
                key={`${d}${h}`}
                data-cell
                className={`rounded-md border ${r === lunchRow && hasShift1 ? 'border-transparent bg-white/[0.06]' : 'border-white/5'} ${c === todayCol ? 'bg-brand-400/10' : 'bg-white/[0.02]'}`}
                style={{
                  gridColumn: c + 2,
                  gridRow: r + 2,
                  backgroundImage: r === lunchRow && hasShift1 ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 8px, transparent 8px 16px)' : undefined,
                }}
              />
            ))
          )}

          {hasShift1 && lunchRow >= 0 && (
            <div className="pointer-events-none flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]" style={{ gridColumn: `2 / span ${days.length}`, gridRow: lunchRow + 2 }}>
              <Coffee size={13} /> Lunch break
            </div>
          )}

          {sessions.map((s, i) => {
            const row = HOURS.indexOf(s.start) + 2;
            const col = days.indexOf(s.day) + 2;
            if (row < 2 || col < 2) return null;
            const primary = perspective === 'faculty' ? { icon: GraduationCap, text: s.section } : { icon: UserRound, text: s.faculty };
            const secondary = perspective === 'room' ? { icon: GraduationCap, text: s.section } : { icon: DoorOpen, text: s.room };
            return (
              <button
                key={s.id}
                data-session
                onClick={() => onSelect?.(s)}
                className="group relative z-10 flex flex-col overflow-hidden rounded-[5px] border bg-white/[0.04] p-2 pl-2.5 text-left text-[var(--text-primary)] transition hover:shadow-md"
                style={{
                  gridColumn: col,
                  gridRow: `${row} / span ${s.duration}`,
                  ...sessionStyle(s.color),
                  transform: iso ? `translateZ(${18 + s.duration * 12}px)` : undefined,
                  boxShadow: iso ? '0 18px 30px -12px rgba(0,0,0,0.6)' : undefined,
                  animation: `fade-up .35s ${Math.min(i, 30) * 10}ms both`,
                }}
                aria-label={`${s.subjectName}, ${s.day} ${fmtHour(s.start)}, ${s.room}`}
              >
                <span className="flex items-start justify-between gap-1">
                  <span className="line-clamp-2 text-[12px] font-semibold leading-4">{s.subjectName}</span>
                  {s.isLab && (
                    <span className="flex shrink-0 items-center gap-0.5 rounded bg-black/25 px-1 py-0.5 text-[9px] font-bold uppercase text-white/90 ring-1 ring-white/15">
                      <FlaskConical size={9} /> Lab
                    </span>
                  )}
                </span>
                <span className="mt-auto space-y-0.5 text-[10.5px] text-slate-300">
                  <span className="flex items-center gap-1 truncate">
                    <primary.icon size={10} className="shrink-0 opacity-70" /> <span className="truncate">{primary.text}</span>
                  </span>
                  <span className="flex items-center gap-1 truncate font-mono text-[10px] text-slate-300">
                    <secondary.icon size={10} className="shrink-0 opacity-70" /> {secondary.text} · {s.subjectCode}
                  </span>
                </span>
              </button>
            );
          })}

          {showNow && !iso && (
            <div
              className="pointer-events-none relative z-20 no-print"
              style={{ gridColumn: todayCol + 2, gridRow: `${Math.floor(hourFloat - HOURS[0]) + 2}`, transform: `translateY(${(hourFloat % 1) * ROW_H}px)`, height: 0 }}
            >
              <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-600" />
              <span className="absolute inset-x-0 top-0 h-0.5 bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

/** Phone layout: pick a day, then see that day's classes as a list. */
function AgendaView({ sessions, days, perspective, onSelect, todayName }: { sessions: Session[]; days: string[]; perspective: GridPerspective; onSelect?: (s: Session) => void; todayName: string }) {
  const [day, setDay] = useState(() => (days.includes(todayName) ? todayName : days[0]));
  const list = sessions.filter((s) => s.day === day).sort((a, b) => a.start - b.start);
  const counts = Object.fromEntries(days.map((d) => [d, sessions.filter((s) => s.day === d).length]));

  return (
    <div className="sm:hidden print:hidden">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Day">
        {days.map((d) => {
          const active = d === day;
          const date = dateOf(d);
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              onClick={() => setDay(d)}
              className={`flex min-w-[58px] shrink-0 flex-col items-center rounded-lg border px-2 py-2 transition ${active ? 'border-brand-700 pill-active' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)]'}`}
            >
              <span className="text-[11px] font-semibold uppercase">{d.slice(0, 3)}</span>
              <span className="text-base font-semibold leading-6">{date.getDate()}</span>
              <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${counts[d] ? (active ? 'bg-white/[0.04]' : 'bg-brand-400') : 'bg-transparent'}`} />
              {d === todayName && <span className="sr-only">today</span>}
            </button>
          );
        })}
      </div>

      <p className="mb-3 mt-2 text-xs text-[var(--text-muted)]">
        {day}
        {day === todayName ? ' · Today' : ''} · {list.length} class{list.length === 1 ? '' : 'es'}
      </p>

      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 px-4 py-10 text-center text-sm text-[var(--text-muted)]">No classes on {day}.</div>
      ) : (
        <ol className="space-y-2.5">
          {list.map((s, i) => {
            const prev = list[i - 1];
            const lunch = prev && prev.start + prev.duration <= 13 && s.start >= 14;
            const other = perspective === 'faculty' ? s.section : s.faculty;
            const place = perspective === 'room' ? s.section : s.room;
            return (
              <li key={s.id}>
                {lunch && (
                  <p className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    <Coffee size={12} /> Lunch break
                  </p>
                )}
                <button onClick={() => onSelect?.(s)} className="relative flex w-full gap-3 overflow-hidden rounded-md border bg-white/[0.04] p-3.5 text-left text-[var(--text-primary)]" style={sessionStyle(s.color)}>
                  <span className="w-[62px] shrink-0">
                    <span className="block text-sm font-bold">{fmtHour(s.start).replace(':00', '')}</span>
                    <span className="block text-[11px] text-slate-300">{s.duration}h</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold leading-5">{s.subjectName}</span>
                      {s.isLab && (
                        <span className="flex shrink-0 items-center gap-0.5 rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/90 ring-1 ring-white/15">
                          <FlaskConical size={9} /> Lab
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        {perspective === 'faculty' ? <GraduationCap size={11} /> : <UserRound size={11} />} {other}
                      </span>
                      <span className="flex items-center gap-1">
                        <DoorOpen size={11} /> {place}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
