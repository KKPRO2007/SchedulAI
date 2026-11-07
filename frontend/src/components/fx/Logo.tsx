export default function Logo({ size = 40, withText = true, sub }: { size?: number; withText?: boolean; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 opacity-60 blur-md" />
        <svg viewBox="0 0 40 40" width={size} height={size} className="relative" aria-hidden="true">
          <defs>
            <linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8b5cf6" />
              <stop offset="0.55" stopColor="#6366f1" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#lg-a)" />
          <rect x="1.5" y="1.5" width="37" height="37" rx="10.5" fill="none" stroke="rgba(255,255,255,0.35)" />
          {/* isometric cube made of time slots */}
          <path d="M20 8 L31 14 L20 20 L9 14 Z" fill="rgba(255,255,255,0.95)" />
          <path d="M9 14 L20 20 L20 32 L9 26 Z" fill="rgba(255,255,255,0.55)" />
          <path d="M31 14 L20 20 L20 32 L31 26 Z" fill="rgba(255,255,255,0.75)" />
          <path d="M14.5 17 L14.5 29 M25.5 17 L25.5 29 M9 20 L20 26 L31 20" stroke="url(#lg-a)" strokeWidth="1.2" fill="none" opacity="0.8" />
        </svg>
      </div>
      {withText && (
        <div className="leading-tight">
          <p className="font-display text-lg font-bold text-white">
            Schedul<span className="text-gradient">AI</span>
          </p>
          {sub && <p className="text-[11px] text-[var(--text-muted)]">{sub}</p>}
        </div>
      )}
    </div>
  );
}
