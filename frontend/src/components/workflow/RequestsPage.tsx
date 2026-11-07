import { useMemo, useState } from 'react';
import { Check, Clock, GitPullRequestArrow, Loader2, Plus, Replace, Send, UserCheck, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Modal from '../ui/Modal';
import { createRequest, createVersion, nextLabel, resolveRequest, usePublished, useRequests, useVersions } from '../../lib/workflow';
import { useRole, useSession } from '../../lib/auth';
import { useAllData } from '../../lib/useData';
import { rankSubstitutes } from '../../lib/substitution';
import { scoreTimetable, loadWeights } from '../../lib/scoring';
import { DAYS, fmtHour, type Session } from '../../lib/scheduler';
import { navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import type { ChangeRequest } from '../../lib/types';

const TYPE_LABEL: Record<ChangeRequest['type'], string> = {
  leave: 'Leave / absence',
  substitution: 'Substitution',
  room: 'Room change',
  availability: 'Availability',
  other: 'Other',
};

const STATUS_CHIP = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  rejected: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

export default function RequestsPage() {
  const role = useRole();
  const staff = role === 'admin' || role === 'coordinator';
  const { data: requests, error } = useRequests();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [form, setForm] = useState(false);
  const [plan, setPlan] = useState<{ facultyEmail?: string; day?: string; request?: ChangeRequest } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const list = (requests ?? []).filter((r) => filter === 'all' || r.status === 'pending');

  async function resolve(r: ChangeRequest, status: 'approved' | 'rejected') {
    const resolution = window.prompt(status === 'approved' ? 'Resolution note (optional):' : 'Reason for rejecting:') ?? null;
    if (resolution === null) return;
    setBusy(r.id);
    try {
      await resolveRequest(r.id, status, resolution.trim() || undefined);
      toast(`Request #${r.id} ${status}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update', 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Human in the loop"
        title="Change requests"
        text={
          staff
            ? 'Requests from faculty and coordinators. For an absence, plan ranked substitutes; the result becomes a new draft version that still needs approval.'
            : 'Tell the timetable office about leave, a needed substitution, a room problem or an availability change. You’ll see the decision here.'
        }
        actions={
          <>
            {staff && (
              <button onClick={() => setPlan({})} className="btn btn-ghost">
                <Replace size={17} /> Plan substitutes
              </button>
            )}
            {role !== 'student' && (
              <button onClick={() => setForm(true)} className="btn btn-primary">
                <Plus size={17} /> New request
              </button>
            )}
          </>
        }
      />

      <div className="flex gap-1.5">
        {(['pending', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${filter === f ? 'bg-white text-[#0b0d1a]' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
            {f === 'pending' ? `Pending (${(requests ?? []).filter((r) => r.status === 'pending').length})` : `All (${requests?.length ?? 0})`}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {!requests && !error && <div className="skeleton h-24 w-full" />}
        {requests && list.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center text-sm text-[var(--text-secondary)]">
            <GitPullRequestArrow className="mx-auto mb-3 text-[var(--text-muted)]" /> {filter === 'pending' ? 'No pending requests.' : 'No requests yet.'}
          </div>
        )}
        {list.map((r) => (
          <article key={r.id} className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">#{r.id}</span>
                  <p className="font-semibold text-white">{r.title}</p>
                  <span className={`chip ${STATUS_CHIP[r.status]}`}>{r.status}</span>
                  <span className="chip">{TYPE_LABEL[r.type]}</span>
                  {r.priority === 'high' && <span className="chip border-rose-400/30 text-rose-200">high priority</span>}
                </div>
                {r.details && <p className="mt-2 text-sm text-[var(--text-secondary)]">{r.details}</p>}
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {fmt(r.createdAt)}
                  </span>
                  <span>
                    {r.requestedBy} ({r.requesterRole})
                  </span>
                  {typeof r.payload?.day === 'string' && <span>Day: {r.payload.day}</span>}
                </p>
                {r.resolution && (
                  <p className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-[var(--text-secondary)]">
                    {r.resolvedBy}: “{r.resolution}”
                  </p>
                )}
              </div>
              {staff && r.status === 'pending' && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {(r.type === 'leave' || r.type === 'substitution') && (
                    <button onClick={() => setPlan({ facultyEmail: String(r.payload?.facultyEmail ?? r.requestedBy), day: String(r.payload?.day ?? ''), request: r })} className="btn btn-primary px-3 py-2 text-xs">
                      <Replace size={14} /> Plan substitutes
                    </button>
                  )}
                  <button onClick={() => resolve(r, 'approved')} disabled={busy === r.id} className="btn btn-ghost px-3 py-2 text-xs">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => resolve(r, 'rejected')} disabled={busy === r.id} className="btn btn-danger px-3 py-2 text-xs">
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      {form && <RequestForm onClose={() => setForm(false)} />}
      {plan && <SubstitutionPlanner initial={plan} onClose={() => setPlan(null)} />}
    </div>
  );
}

function RequestForm({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const [type, setType] = useState<ChangeRequest['type']>('leave');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<ChangeRequest['priority']>('normal');
  const [day, setDay] = useState('Monday');
  const [saving, setSaving] = useState(false);
  const needsDay = type === 'leave' || type === 'substitution';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createRequest({
        type,
        title: title.trim() || `${TYPE_LABEL[type]}${needsDay ? ` on ${day}` : ''}`,
        details: details.trim() || undefined,
        priority,
        payload: needsDay ? { day, facultyEmail: session?.user.email } : undefined,
      });
      toast('Request sent to the timetable office');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New change request" subtitle="Requests are reviewed by a coordinator or administrator.">
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as ChangeRequest['type'])} className="form-input">
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ChangeRequest['priority'])} className="form-input">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        {needsDay && (
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--text-secondary)]">Day affected</span>
            <select value={day} onChange={(e) => setDay(e.target.value)} className="form-input">
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--text-secondary)]">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${TYPE_LABEL[type]}${needsDay ? ` on ${day}` : ''}`} className="form-input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--text-secondary)]">Details</span>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="form-input resize-none" placeholder="Reason, preferred substitute, room number…" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send request
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SubstitutionPlanner({ initial, onClose }: { initial: { facultyEmail?: string; day?: string; request?: ChangeRequest }; onClose: () => void }) {
  const data = useAllData();
  const published = usePublished();
  const versions = useVersions();
  const tt = published.data?.payload;
  const teachers = useMemo(() => (tt ? [...new Map(tt.sessions.map((s) => [s.facultyEmail.toLowerCase(), s.faculty])).entries()].sort((a, b) => a[1].localeCompare(b[1])) : []), [tt]);
  const [email, setEmail] = useState(initial.facultyEmail?.toLowerCase() ?? '');
  const [day, setDay] = useState(initial.day && DAYS.includes(initial.day) ? initial.day : 'Monday');
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const who = email || teachers[0]?.[0] || '';
  const affected: Session[] = useMemo(() => (tt ? tt.sessions.filter((s) => s.facultyEmail.toLowerCase() === who && s.day === day).sort((a, b) => a.start - b.start) : []), [tt, who, day]);
  const ranked = useMemo(() => Object.fromEntries(affected.map((s) => [s.id, rankSubstitutes(s, tt?.sessions ?? [], data.faculty, who)])), [affected, tt, data.faculty, who]);

  async function apply() {
    if (!tt || !published.data) return;
    setSaving(true);
    try {
      const byEmail = new Map(data.faculty.map((f) => [f.email.toLowerCase(), f]));
      const sessions = tt.sessions.map((s) => {
        const pick = choice[s.id] ?? ranked[s.id]?.[0]?.faculty.email;
        const f = affected.some((a) => a.id === s.id) && pick ? byEmail.get(pick.toLowerCase()) : null;
        return f ? { ...s, faculty: f.name, facultyEmail: f.email } : s;
      });
      const next = { ...tt, sessions, generatedAt: new Date().toISOString() };
      const absent = teachers.find(([e]) => e === who)?.[1] ?? who;
      const score = scoreTimetable(next, { faculty: data.faculty, rooms: data.rooms, sections: data.sections, previous: tt.sessions }, loadWeights());
      const label = nextLabel(versions.data, `Substitutes for ${absent} (${day})`);
      const v = await createVersion(label, next, score, `${affected.length} class${affected.length === 1 ? '' : 'es'} reassigned for ${absent} on ${day}`);
      if (initial.request) await resolveRequest(initial.request.id, 'approved', `Substitutes planned in draft ${v.label}`);
      toast(`Draft ${v.label} created. Submit it for approval on the Versions page.`);
      onClose();
      navigate('/app/versions');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the draft', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open wide onClose={onClose} title="Plan substitutes" subtitle="Candidates must be available and free; ranked by subject competency, department, spare workload and preferred window.">
      <div className="space-y-5 p-4 sm:p-6">
        {!tt ? (
          <p className="text-sm text-[var(--text-secondary)]">{published.loading ? 'Loading the published timetable…' : 'Publish a timetable first.'}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">Absent faculty member</span>
                <select value={who} onChange={(e) => setEmail(e.target.value)} className="form-input">
                  {teachers.map(([e, n]) => (
                    <option key={e} value={e}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">Day</span>
                <select value={day} onChange={(e) => setDay(e.target.value)} className="form-input">
                  {tt.days.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>

            {affected.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-[var(--text-muted)]">No classes for this teacher on {day}. Nothing to cover.</p>
            ) : (
              <div className="space-y-3">
                {affected.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm font-semibold text-white">
                      {fmtHour(s.start)} · {s.subjectName} <span className="font-normal text-[var(--text-muted)]">· {s.section} · {s.room}</span>
                    </p>
                    {ranked[s.id]?.length ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {ranked[s.id].map((c, i) => {
                          const picked = (choice[s.id] ?? ranked[s.id][0].faculty.email) === c.faculty.email;
                          return (
                            <button
                              key={c.faculty.email}
                              onClick={() => setChoice((x) => ({ ...x, [s.id]: c.faculty.email }))}
                              className={`flex items-start gap-3 rounded-xl border p-3 text-left text-xs transition ${picked ? 'border-violet-300/60 bg-violet-500/15' : 'border-white/5 bg-black/20 hover:border-white/20'}`}
                            >
                              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-white'}`}>{i + 1}</span>
                              <span className="min-w-0">
                                <span className="block font-semibold text-white">
                                  {c.faculty.name} {picked && <UserCheck size={12} className="inline text-violet-300" />}
                                </span>
                                <span className="block text-[var(--text-muted)]">{c.reasons.join(' · ')}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-amber-200">Nobody is free at this hour. Consider moving the class instead.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
              <button onClick={apply} disabled={saving || affected.length === 0} className="btn btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Replace size={16} />} Create draft with these substitutes
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
