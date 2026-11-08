import { useId } from 'react';

/** Rounded tile of 3×3 timetable slots; a rising diagonal of filled slots ends in a gold "scheduled" slot. */
export function LogoMark({ size = 40 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  const slots = [
    [0.28, 0.28, 'gold'],
    [0.28, 1, 0.28],
    [1, 0.28, 0.28],
  ] as const;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className="shrink-0 drop-shadow-[0_6px_16px_rgba(59,130,246,0.35)]">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.55" stopColor="#2453b8" />
          <stop offset="1" stopColor="#172f6e" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${id}-bg)`} />
      <path d="M10 0h20a10 10 0 0 1 10 10v6C28 21 12 21 0 16v-6A10 10 0 0 1 10 0z" fill={`url(#${id}-shine)`} />
      <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" fill="none" stroke="#ffffff" strokeOpacity="0.22" />
      {slots.map((row, r) =>
        row.map((v, c) => (
          <rect
            key={`${r}${c}`}
            x={9 + c * 8}
            y={9 + r * 8}
            width="6"
            height="6"
            rx="1.6"
            fill={v === 'gold' ? `url(#${id}-gold)` : '#ffffff'}
            fillOpacity={v === 'gold' ? 1 : v}
          />
        ))
      )}
    </svg>
  );
}

export default function Logo({ size = 40, withText = true, sub }: { size?: number; withText?: boolean; sub?: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {withText && (
        <div className="leading-tight">
          <p className="text-[17px] font-bold tracking-tight text-white">
            Schedul<span className="bg-gradient-to-r from-sky-300 to-amber-300 bg-clip-text text-transparent">AI</span>
          </p>
          {sub && <p className="text-[11px] text-white/60">{sub}</p>}
        </div>
      )}
    </div>
  );
}
