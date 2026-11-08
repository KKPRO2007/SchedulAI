import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Database, HardDrive, Menu, Search } from 'lucide-react';
import { NAV, PAGE_SUBTITLE, navFor, type PageId } from './nav';
import { useRole } from '../../lib/auth';
import { useDataMode } from '../../lib/useData';
import { navigate } from '../../lib/router';

export default function Topbar({ active, onMenu }: { active: PageId; onMenu: () => void }) {
  const mode = useDataMode();
  const role = useRole();
  const page = NAV.find((n) => n.id === active)!;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName);
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const results = navFor(role).filter((n) => `${n.label} ${PAGE_SUBTITLE[n.id]}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-4 chrome border-b border-[var(--line)] px-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="icon-btn lg:hidden" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden text-[var(--text-muted)] sm:inline">{page.group}</span>
          <ChevronRight size={14} className="hidden shrink-0 text-slate-500 sm:block" />
          <span className="truncate font-semibold text-[var(--text-primary)]">{page.label}</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 rounded-md border border-[var(--line-strong)] bg-white/[0.04] px-3 py-1.5 transition focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-400/20">
            <Search size={15} className="text-[var(--text-muted)]" />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) {
                  navigate(`/app/${results[0].id}`);
                  setQuery('');
                  input.current?.blur();
                }
                if (e.key === 'Escape') input.current?.blur();
              }}
              placeholder="Go to page…"
              className="w-40 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-slate-500 lg:w-52"
            />
            <kbd className="rounded border border-[var(--line)] bg-white/[0.04] px-1.5 py-px font-sans text-[10px] text-[var(--text-muted)]">Ctrl K</kbd>
          </div>
          {open && (
            <div className="absolute right-0 top-11 w-72 overflow-hidden rounded-2xl glass-strong p-1 shadow-lg">
              {results.length === 0 && <p className="px-3 py-2.5 text-sm text-[var(--text-muted)]">No matches</p>}
              {results.map((r) => (
                <button
                  key={r.id}
                  onMouseDown={() => {
                    navigate(`/app/${r.id}`);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-[var(--text-primary)]"
                >
                  <r.icon size={16} className="text-slate-400" /> {r.label}
                  <span className="ml-auto truncate text-[11px] text-[var(--text-muted)]">{PAGE_SUBTITLE[r.id]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {mode && (
          <span
            title={mode === 'server' ? 'Connected to the API and PostgreSQL' : 'No server reachable: demo data is stored in this browser'}
            className={`chip ${mode === 'server' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}
          >
            {mode === 'server' ? <Database size={12} /> : <HardDrive size={12} />}
            <span className="hidden sm:inline">{mode === 'server' ? 'Live database' : 'Demo data · this browser'}</span>
          </span>
        )}
      </div>
    </header>
  );
}
