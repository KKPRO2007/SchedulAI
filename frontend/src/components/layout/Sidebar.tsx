import { BookUser, LogOut, ShieldCheck, UserRound, Workflow } from 'lucide-react';
import Logo from '../fx/Logo';
import { GROUPS, navFor, type PageId } from './nav';
import { logout, ROLE_LABEL, useSession } from '../../lib/auth';
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
  const groups = GROUPS.filter((g) => items.some((i) => i.group === g));
  const RoleIcon = role === 'admin' ? ShieldCheck : role === 'coordinator' ? Workflow : role === 'faculty' ? UserRound : BookUser;
  const readOnly = role === 'student' || role === 'faculty';

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-30 bg-black/60 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col chrome border-r border-[var(--line)] transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center border-b border-[var(--line)] px-5">
          <a href="#/" aria-label="Home">
            <Logo size={32} light sub={`${ROLE_LABEL[role]} workspace`} />
          </a>
        </div>

        <div className="mx-3 mt-3 flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-xs text-[var(--text-secondary)] ring-1 ring-[var(--line)]">
          <RoleIcon size={14} className="text-brand-300" />
          Signed in as <span className="font-semibold text-[var(--text-primary)]">{ROLE_LABEL[role]}</span>
          {readOnly && <span className="ml-auto text-[10px] text-[var(--text-muted)]">{role === 'student' ? 'read-only' : 'limited'}</span>}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{g}</p>
              <div className="space-y-0.5">
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
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                          isActive ? 'bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-transparent text-white' : 'text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-gradient-to-b from-sky-400 to-indigo-500" />}
                        <item.icon size={17} className={isActive ? 'text-brand-300' : 'text-slate-500'} />
                        <span>{item.label}</span>
                        {item.badge && <span className="ml-auto rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-px text-[9px] font-bold tracking-wider text-amber-300">{item.badge}</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--line)] p-3">
          <div className="flex items-center gap-3 rounded-md p-2">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${readOnly ? 'bg-teal-600' : 'bg-brand-600'}`}>{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name}</p>
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
