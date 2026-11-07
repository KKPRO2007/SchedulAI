import { FileJson, FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react';
import type { EntityKey } from '../../lib/types';
import { ENTITY_COLOR } from '../../lib/import/entityStyle';


const EXT_STYLE: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  xlsx: { icon: FileSpreadsheet, from: '#16a34a', to: '#0d9488' },
  xlsm: { icon: FileSpreadsheet, from: '#16a34a', to: '#0d9488' },
  xlsb: { icon: FileSpreadsheet, from: '#16a34a', to: '#0d9488' },
  xls: { icon: FileSpreadsheet, from: '#15803d', to: '#4d7c0f' },
  ods: { icon: FileSpreadsheet, from: '#0284c7', to: '#2563eb' },
  csv: { icon: FileText, from: '#7c3aed', to: '#c026d3' },
  tsv: { icon: FileText, from: '#7c3aed', to: '#c026d3' },
  txt: { icon: FileText, from: '#64748b', to: '#475569' },
  json: { icon: FileJson, from: '#d97706', to: '#dc2626' },
};

export function FileBadge({ ext, size = 44 }: { ext: string; size?: number }) {
  const s = EXT_STYLE[ext] ?? EXT_STYLE.txt;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size * 1.18 }}>
      <svg viewBox="0 0 40 47" width={size} height={size * 1.18} className="absolute inset-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]" aria-hidden="true">
        <defs>
          <linearGradient id={`fb-${ext}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={s.from} />
            <stop offset="1" stopColor={s.to} />
          </linearGradient>
        </defs>
        <path d="M4 0h22l14 14v29a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={`url(#fb-${ext})`} />
        <path d="M26 0v10a4 4 0 0 0 4 4h10z" fill="rgba(255,255,255,0.35)" />
      </svg>
      <span className="relative mt-2 text-[9px] font-black uppercase tracking-wide text-white">{ext.slice(0, 4)}</span>
    </span>
  );
}

export function EntityDot({ entity }: { entity: EntityKey }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: ENTITY_COLOR[entity], boxShadow: `0 0 10px ${ENTITY_COLOR[entity]}` }} />;
}

export function ConfidenceRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} title={`Detection confidence ${pct}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-g)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ transition: 'stroke-dashoffset 1s' }} />
        <defs>
          <linearGradient id="ring-g">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{pct}%</span>
    </span>
  );
}

