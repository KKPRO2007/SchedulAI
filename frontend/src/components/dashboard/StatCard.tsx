import type { LucideIcon } from 'lucide-react';
import Tilt from '../fx/Tilt';
import CountUp from '../fx/CountUp';

const TONES = {
  violet: { icon: 'text-violet-200 bg-violet-500/15 border-violet-400/20', glow: 'from-violet-500/25' },
  sky: { icon: 'text-sky-200 bg-sky-500/15 border-sky-400/20', glow: 'from-sky-500/25' },
  fuchsia: { icon: 'text-fuchsia-200 bg-fuchsia-500/15 border-fuchsia-400/20', glow: 'from-fuchsia-500/25' },
  emerald: { icon: 'text-emerald-200 bg-emerald-500/15 border-emerald-400/20', glow: 'from-emerald-500/25' },
  amber: { icon: 'text-amber-200 bg-amber-500/15 border-amber-400/20', glow: 'from-amber-500/25' },
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
    <Tilt onClick={onClick} className={`glass group h-full overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-5 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className={`absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-2xl transition duration-500 group-hover:scale-150`} />
      <div className="relative flex items-start justify-between" style={{ transform: 'translateZ(30px)' }}>
        <p className="min-w-0 text-xs font-medium text-[var(--text-secondary)] sm:text-sm">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 sm:rounded-xl ${t.icon}`}>
          <Icon size={19} />
        </span>
      </div>
      <p className="font-display relative mt-3 text-3xl font-bold text-white sm:mt-4 sm:text-4xl" style={{ transform: 'translateZ(45px)' }}>
        <CountUp value={value} suffix={suffix} />
      </p>
      {note && <p className="relative mt-1.5 line-clamp-2 text-[11px] text-[var(--text-muted)] sm:text-xs">{note}</p>}
      {bars && bars.length > 0 && (
        <div className="relative mt-4 hidden h-8 items-end gap-[2px] sm:flex" aria-hidden="true">
          {bars.map((b, i) => (
            <span key={i} className="flex-1 rounded-t-[3px] bg-white/25 transition-all duration-700 group-hover:bg-white/40" style={{ height: `${Math.max(8, (b / max) * 100)}%` }} />
          ))}
        </div>
      )}
    </Tilt>
  );
}
