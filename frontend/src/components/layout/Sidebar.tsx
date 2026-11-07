import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import Logo from '../fx/Logo';
import { navFor, type PageId } from './nav';
import { logout, useSession } from '../../lib/auth';
import { navigate } from '../../lib/router';

export default function Sidebar({ active, open, onClose }: { active: PageId; open: boolean; onClose: () => void }) {
  const session = useSession();
  const user = session?.user;
  const role = user?.role ?? 'admin';
  const name = user?.name ?? 'Admin';
  const initials = name
    .replace(/^(dr|prof)\.?\s+/i, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const items = navFor(role);
  const groups = (['Workspace', 'Data', 'System'] as const).filter((g) => items.some((i) => i.group === g));

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside
        className={`glass-strong no-print fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-y-0 border-l-0 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-20 items-center px-6">
          <a href="#/" aria-label="Home">
            <Logo size={38} sub={role === 'faculty' ? 'Faculty portal' : 'Admin workspace'} />
          </a>
        </div>

        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-[var(--text-secondary)]">
          {role === 'faculty' ? <UserRound size={14} className="text-sky-300" /> : <ShieldCheck size={14} className="text-violet-300" />}
          Signed in as <span className="font-semibold text-white">{role === 'faculty' ? 'Faculty' : 'Admin'}</span>
          {role === 'faculty' && <span className="ml-auto text-[10px] text-[var(--text-muted)]">read-only</span>}
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--text-muted)]">{g}</p>
              <div className="space-y-1">
                {items
                  .filter((n) => n.group === g)
                  .map((item) => {
                    const isActive = active === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(`/app/${item.id}`);
                          onClose();
                        }}
                        className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          isActive ? 'text-white' : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <>
                            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/25 via-indigo-500/15 to-transparent" />
                            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-violet-400 to-sky-400 shadow-[0_0_12px_rgba(139,92,246,0.9)]" />
                          </>
                        )}
                        <item.icon size={18} className={`relative transition ${isActive ? 'text-violet-300' : ''}`} />
                        <span className="relative">{item.label}</span>
                        {item.badge && (
                          <span className="relative ml-auto rounded-md bg-gradient-to-r from-violet-500 to-sky-400 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white">{item.badge}</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${role === 'faculty' ? 'from-sky-500 to-emerald-400' : 'from-violet-500 to-sky-400'}`}>{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{user?.title ?? user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="icon-btn"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
