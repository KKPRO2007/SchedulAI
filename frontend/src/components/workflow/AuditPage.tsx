import { useMemo, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import { useAudit } from '../../lib/workflow';

const ROLE_DOT: Record<string, string> = { admin: 'bg-brand-600', coordinator: 'bg-sky-600', faculty: 'bg-emerald-600', student: 'bg-amber-500', system: 'bg-slate-400' };

export default function AuditPage() {
  const { data, error } = useAudit();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');

  const rows = useMemo(
    () => (data ?? []).filter((e) => (role === 'all' || e.role === role) && (!q || `${e.actor} ${e.action} ${e.detail ?? ''}`.toLowerCase().includes(q.toLowerCase()))),
    [data, q, role]
  );

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Traceability" title="Audit log" text="Every generation, approval, publication, import and request is recorded with the actor and time. Only the event is stored, never file contents or secrets." />

      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-wrap gap-1.5">
            {['all', 'admin', 'coordinator', 'faculty', 'student'].map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${role === r ? 'pill-active' : 'bg-white/[0.06] text-[var(--text-secondary)]'}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events…" className="form-input py-2 pl-9" aria-label="Search audit log" />
          </div>
        </div>
        {error && <p className="p-5 text-sm text-rose-300">{error}</p>}
        {!data && !error && <div className="skeleton m-5 h-40" />}
        {data && rows.length === 0 && (
          <p className="p-10 text-center text-sm text-[var(--text-muted)]">
            <ScrollText className="mx-auto mb-2" /> No matching events
          </p>
        )}
        <ol className="divide-y divide-white/5">
          {rows.map((e) => (
            <li key={e.id} className="flex gap-3 px-4 py-3 sm:px-5">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ROLE_DOT[e.role] ?? 'bg-slate-500'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--text-primary)]">
                  <span className="font-semibold">{e.actor}</span> <span className="text-[var(--text-secondary)]">{e.action}</span>
                </p>
                {e.detail && <p className="truncate text-xs text-[var(--text-muted)]">{e.detail}</p>}
              </div>
              <time className="shrink-0 text-right text-[11px] text-[var(--text-muted)]">
                {new Date(e.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                <span className="block capitalize">{e.role}</span>
              </time>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
