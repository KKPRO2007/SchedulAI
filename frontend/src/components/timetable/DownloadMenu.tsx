import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarPlus, ChevronDown, Download, FileDown, FileSpreadsheet, FileText, Printer, Sheet } from 'lucide-react';

export type DownloadAction = { id: string; label: string; hint: string; icon: 'excel' | 'excel-all' | 'csv' | 'ics' | 'pdf' | 'print'; run: () => void };

const ICONS = { excel: FileSpreadsheet, 'excel-all': Sheet, csv: FileText, ics: CalendarPlus, pdf: FileDown, print: Printer };
const MENU_W = 320;

/** Download button whose menu is portalled to <body>, so cards with overflow-hidden never clip it. */
export default function DownloadMenu({ actions, label = 'Download' }: { actions: DownloadAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = button.current!.getBoundingClientRect();
      const width = Math.min(MENU_W, window.innerWidth - 16);
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8, r.left));
      const below = window.innerHeight - r.bottom;
      const up = below < 300 && r.top > below;
      setPos({ top: up ? r.top - 6 : r.bottom + 6, left, up });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => !button.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', on);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mousedown', on);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <>
      <button ref={button} onClick={() => setOpen((o) => !o)} className="btn btn-ghost" aria-expanded={open} aria-haspopup="menu">
        <Download size={17} /> {label} <ChevronDown size={15} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            className="glass-strong fixed z-[70] overflow-hidden rounded-2xl p-1.5"
            style={{ top: pos.top, left: pos.left, width: Math.min(MENU_W, window.innerWidth - 16), transform: pos.up ? 'translateY(-100%)' : undefined, animation: 'fade-up .2s both' }}
          >
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
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.07]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/25 to-indigo-500/25 text-sky-300 ring-1 ring-white/10">
                    <Icon size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[var(--text-primary)]">{a.label}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{a.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
