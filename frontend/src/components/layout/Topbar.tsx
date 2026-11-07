import { useEffect, useRef, useState } from 'react';
import { Command, Database, HardDrive, Menu, Search } from 'lucide-react';
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
    <header className="glass-strong no-print sticky top-0 z-20 flex h-20 items-center justify-between gap-4 border-x-0 border-t-0 px-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} className="icon-btn lg:hidden" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <h2 className="font-display truncate text-xl font-bold text-white">{page.label}</h2>
          <p className="hidden truncate text-sm text-[var(--text-muted)] sm:block">{PAGE_SUBTITLE[active]}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 transition focus-within:border-violet-400/60 focus-within:shadow-[0_0_0_4px_rgba(124,92,255,0.15)]">
            <Search size={16} className="text-[var(--text-muted)]" />
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
              placeholder="Jump to…"
              className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)] lg:w-52"
            />
            <kbd className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              <Command size={10} />K
            </kbd>
          </div>
          {open && (
            <div className="glass-strong absolute right-0 top-12 w-72 overflow-hidden rounded-2xl p-1.5 shadow-2xl">
              {results.length === 0 && <p className="px-3 py-2.5 text-sm text-[var(--text-muted)]">No matches</p>}
              {results.map((r) => (
                <button
                  key={r.id}
                  onMouseDown={() => {
                    navigate(`/app/${r.id}`);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-white"
                >
                  <r.icon size={16} /> {r.label}
                  <span className="ml-auto truncate text-[11px] text-[var(--text-muted)]">{PAGE_SUBTITLE[r.id]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {mode && (
          <span
            title={mode === 'server' ? 'Connected to the API and PostgreSQL' : 'No server reachable: demo data is stored in this browser'}
            className={`chip ${mode === 'server' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-200'}`}
          >
            {mode === 'server' ? <Database size={12} /> : <HardDrive size={12} />}
            <span className="hidden sm:inline">{mode === 'server' ? 'Live database' : 'Demo data · this browser'}</span>
          </span>
        )}
      </div>
    </header>
  );
}
