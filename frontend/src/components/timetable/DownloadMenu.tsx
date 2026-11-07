import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, ChevronDown, Download, FileSpreadsheet, FileText, Printer, Sheet } from 'lucide-react';

export type DownloadAction = { id: string; label: string; hint: string; icon: 'excel' | 'excel-all' | 'csv' | 'ics' | 'pdf'; run: () => void };

const ICONS = { excel: FileSpreadsheet, 'excel-all': Sheet, csv: FileText, ics: CalendarPlus, pdf: Printer };

export default function DownloadMenu({ actions, label = 'Download' }: { actions: DownloadAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', on);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mousedown', on);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost" aria-expanded={open} aria-haspopup="menu">
        <Download size={17} /> {label} <ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="glass-strong absolute left-0 top-[calc(100%+8px)] z-40 w-[min(20rem,calc(100vw-2rem))] sm:left-auto sm:right-0 overflow-hidden rounded-2xl p-1.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]" style={{ animation: 'fade-up .25s both' }}>
          {actions.map((a) => {
            const Icon = ICONS[a.icon];
            return (
              <button
                key={a.id}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  a.run();
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-violet-200">
                  <Icon size={16} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{a.label}</span>
                  <span className="block text-xs text-[var(--text-muted)]">{a.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
