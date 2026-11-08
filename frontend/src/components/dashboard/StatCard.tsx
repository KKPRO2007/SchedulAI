import type { LucideIcon } from 'lucide-react';
import CountUp from '../fx/CountUp';
import Tilt from '../fx/Tilt';

/** Accent per tone: top line, icon tile and a faint glow. Text stays neutral. */
const TONES = {
  violet: { line: 'from-blue-400 to-indigo-500', icon: 'from-blue-500/30 to-indigo-500/30 text-blue-200', glow: 'bg-indigo-500/20', bar: 'bg-indigo-400/40' },
  sky: { line: 'from-sky-400 to-cyan-400', icon: 'from-sky-500/30 to-cyan-500/30 text-sky-200', glow: 'bg-sky-500/20', bar: 'bg-sky-400/40' },
  fuchsia: { line: 'from-rose-400 to-pink-500', icon: 'from-rose-500/30 to-pink-500/30 text-rose-200', glow: 'bg-rose-500/15', bar: 'bg-rose-400/40' },
  emerald: { line: 'from-emerald-400 to-teal-400', icon: 'from-emerald-500/30 to-teal-500/30 text-emerald-200', glow: 'bg-emerald-500/15', bar: 'bg-emerald-400/40' },
  amber: { line: 'from-amber-300 to-orange-400', icon: 'from-amber-500/30 to-orange-500/30 text-amber-200', glow: 'bg-amber-500/15', bar: 'bg-amber-400/40' },
};

export type Tone = keyof typeof TONES;

export default function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = 'violet',
  suffix,
  onClick,
  bars,
}: {
  label: string;
  value: number | null;
  note?: string;
  icon: LucideIcon;
  tone?: Tone;
  suffix?: string;
  onClick?: () => void;
  /** tiny distribution strip, e.g. per-department counts */
  bars?: number[];
}) {
  const t = TONES[tone];
  const max = Math.max(1, ...(bars ?? []));
  return (
    <Tilt
      as={onClick ? 'button' : 'div'}
      onClick={onClick}
      className={`group block h-full w-full overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.015] p-4 text-left ring-1 ring-white/[0.07] backdrop-blur-xl sm:p-5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <span className={`absolute inset-x-5 top-0 h-px bg-gradient-to-r ${t.line} opacity-80`} />
      <span className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full ${t.glow} blur-2xl transition duration-500 group-hover:scale-125`} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-white/10 ${t.icon}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="relative mt-2 text-[2rem] font-semibold leading-none tabular-nums tracking-tight text-white sm:mt-3 sm:text-[2.25rem]">
        <CountUp value={value} suffix={suffix} />
      </p>
      {note && <p className="relative mt-2 line-clamp-2 text-[11px] text-[var(--text-muted)] sm:text-xs">{note}</p>}
      {bars && bars.length > 0 && (
        <div className="relative mt-4 hidden h-7 items-end gap-[3px] sm:flex" aria-hidden="true">
          {bars.map((b, i) => (
            <span key={i} className={`flex-1 rounded-t-[3px] ${t.bar} transition-all duration-500 group-hover:opacity-100`} style={{ height: `${Math.max(10, (b / max) * 100)}%` }} />
          ))}
        </div>
      )}
    </Tilt>
  );
}
