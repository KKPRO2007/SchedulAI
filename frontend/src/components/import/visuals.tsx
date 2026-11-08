import { FileJson, FileSpreadsheet, FileText, type LucideIcon } from 'lucide-react';
import type { EntityKey } from '../../lib/types';
import { ENTITY_COLOR } from '../../lib/import/entityStyle';


const EXT_STYLE: Record<string, { icon: LucideIcon; from: string; to: string }> = {
  xlsx: { icon: FileSpreadsheet, from: '#16a34a', to: '#0d9488' },
  xlsm: { icon: FileSpreadsheet, from: '#16a34a', to: '#0d9488' },
  xlsb: { icon: FileSpreadsheet, from: '#16a34a', to: '#0d9488' },
  xls: { icon: FileSpreadsheet, from: '#15803d', to: '#4d7c0f' },
  ods: { icon: FileSpreadsheet, from: '#0284c7', to: '#2563eb' },
  csv: { icon: FileText, from: '#1f6f8b', to: '#1f6f8b' },
  tsv: { icon: FileText, from: '#1f6f8b', to: '#1f6f8b' },
  txt: { icon: FileText, from: '#64748b', to: '#475569' },
  json: { icon: FileJson, from: '#b45309', to: '#b45309' },
};

export function FileBadge({ ext, size = 44 }: { ext: string; size?: number }) {
  const s = EXT_STYLE[ext] ?? EXT_STYLE.txt;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size * 1.18 }}>
      <svg viewBox="0 0 40 47" width={size} height={size * 1.18} className="absolute inset-0" aria-hidden="true">
                <path d="M4 0h22l14 14v29a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={s.from} />
        <path d="M26 0v10a4 4 0 0 0 4 4h10z" fill="rgba(255,255,255,0.35)" />
      </svg>
      <span className="relative mt-2 text-[9px] font-black uppercase tracking-wide text-white">{ext.slice(0, 4)}</span>
    </span>
  );
}

export function EntityDot({ entity }: { entity: EntityKey }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: ENTITY_COLOR[entity] }} />;
}

export function ConfidenceRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} title={`Detection confidence ${pct}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#285394" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ transition: 'stroke-dashoffset 1s' }} />
      </svg>
      <span className="absolute text-[10px] font-bold text-[var(--text-primary)]">{pct}%</span>
    </span>
  );
}

