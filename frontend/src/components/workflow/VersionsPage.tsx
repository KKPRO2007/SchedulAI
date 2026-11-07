import { useState } from 'react';
import { ArrowRight, Check, Eye, FileClock, Loader2, RotateCcw, Send, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Modal from '../ui/Modal';
import AllSectionsMatrix from '../timetable/AllSectionsMatrix';
import { STATUS_STYLE, transition, usePublished, useVersion, useVersions } from '../../lib/workflow';
import { useRole } from '../../lib/auth';
import { navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import type { VersionStatus, VersionSummary } from '../../lib/types';

const FLOW: VersionStatus[] = ['draft', 'submitted', 'approved', 'published'];

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function VersionsPage() {
  const role = useRole();
  const { data: versions, error } = useVersions();
  const published = usePublished();
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function move(v: VersionSummary, to: VersionStatus, askNote = false) {
    let note: string | undefined;
    if (askNote) {
      const n = window.prompt(to === 'rejected' ? 'Reason for rejecting (shown to the coordinator):' : 'Note (optional):') ?? null;
      if (n === null) return;
      note = n.trim() || undefined;
    }
    setBusy(`${v.id}-${to}`);
    try {
      await transition(v.id, to, note);
      toast(`${v.label} → ${STATUS_STYLE[to].label}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update', 'error');
    } finally {
      setBusy(null);
    }
  }

  const counts = Object.fromEntries(FLOW.map((s) => [s, (versions ?? []).filter((v) => v.status === s).length])) as Record<VersionStatus, number>;

  const actions = (v: VersionSummary) => {
    const list: { to: VersionStatus; label: string; icon: typeof Send; primary?: boolean; note?: boolean }[] = [];
    if ((v.status === 'draft' || v.status === 'rejected') && (role === 'coordinator' || role === 'admin')) list.push({ to: 'submitted', label: 'Submit', icon: Send, primary: true });
    if (v.status === 'submitted' && role === 'admin') {
      list.push({ to: 'approved', label: 'Approve', icon: Check, primary: true, note: true });
      list.push({ to: 'rejected', label: 'Reject', icon: X, note: true });
    }
    if (v.status === 'approved' && role === 'admin') list.push({ to: 'published', label: 'Publish', icon: Upload, primary: true });
    if (v.status === 'archived' && role === 'admin') list.push({ to: 'published', label: 'Roll back to this', icon: RotateCcw });
    return list;
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Controlled change"
        title="Versions & approval"
        text="Coordinators submit drafts; administrators approve and publish. Publishing archives the previous version instead of overwriting it, so any archived version can be restored."
        actions={
          <button onClick={() => navigate('/app/studio')} className="btn btn-primary">
            <Sparkles size={17} /> New candidate
          </button>
        }
      />

      {/* Lifecycle */}
      <section className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FLOW.map((s, i) => (
            <div key={s} className="flex shrink-0 items-center gap-2">
              <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${STATUS_STYLE[s].chip}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLE[s].dot}`} />
                <span className="text-sm font-semibold">{STATUS_STYLE[s].label}</span>
                <span className="font-display text-lg font-bold text-white">{versions ? counts[s] : '·'}</span>
              </div>
              {i < FLOW.length - 1 && <ArrowRight size={16} className="text-[var(--text-muted)]" />}
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <ShieldCheck size={14} className="text-violet-300" />
          {role === 'admin' ? 'You can approve, reject, publish and roll back.' : 'You can create and submit drafts. An administrator approves and publishes.'} Every step is written to the audit log.
        </p>
      </section>

      {published.data && (
        <section className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.18),transparent_60%)]" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow text-emerald-300">Live for faculty & students</p>
              <p className="font-display mt-1 text-2xl font-bold text-white">{published.data.label}</p>
              <p className="text-sm text-[var(--text-muted)]">
                Published {fmt(published.data.publishedAt)} by {published.data.reviewedBy ?? '—'} · {published.data.sessions} sessions
                {published.data.score ? ` · score ${Math.round(published.data.score.total * 100)}` : ''}
              </p>
            </div>
            <button onClick={() => navigate('/app/timetable')} className="btn btn-ghost">
              <Eye size={16} /> Open published timetable
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {!versions && !error && <div className="skeleton h-24 w-full" />}
        {versions?.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center text-[var(--text-secondary)]">
            <FileClock className="mx-auto mb-3 text-[var(--text-muted)]" /> No versions yet. Generate candidates and save one as a draft.
          </div>
        )}
        {versions?.map((v) => (
          <article key={v.id} className="glass flex flex-col gap-4 rounded-2xl p-4 sm:p-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-sm font-bold text-white">#{v.id}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{v.label}</p>
                  <span className={`chip ${STATUS_STYLE[v.status].chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[v.status].dot}`} /> {STATUS_STYLE[v.status].label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  by {v.createdBy} · {fmt(v.createdAt)}
                  {v.reviewedBy ? ` · reviewed by ${v.reviewedBy} ${fmt(v.reviewedAt)}` : ''}
                </p>
                {v.note && <p className="mt-1.5 text-xs text-[var(--text-secondary)]">“{v.note}”</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              {v.score && (
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs">
                  <span>
                    <span className="font-display block text-lg font-bold leading-5 text-white">{Math.round(v.score.total * 100)}</span>
                    <span className="text-[var(--text-muted)]">score</span>
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {v.score.hardPassed}/{v.score.hardTotal} hard
                    <br />
                    {v.sessions} sessions
                  </span>
                </div>
              )}
              <button onClick={() => setViewing(v.id)} className="btn btn-ghost px-3 py-2 text-xs">
                <Eye size={14} /> View
              </button>
              {actions(v).map((a) => (
                <button key={a.to} onClick={() => move(v, a.to, a.note)} disabled={Boolean(busy)} className={`btn px-3 py-2 text-xs ${a.primary ? 'btn-primary' : a.to === 'rejected' ? 'btn-danger' : 'btn-ghost'}`}>
                  {busy === `${v.id}-${a.to}` ? <Loader2 size={14} className="animate-spin" /> : <a.icon size={14} />} {a.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <VersionModal id={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function VersionModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: v } = useVersion(id);
  const [day, setDay] = useState('Monday');
  if (!id) return null;
  return (
    <Modal open wide onClose={onClose} title={v?.label ?? 'Loading…'} subtitle={v ? `${STATUS_STYLE[v.status].label} · ${v.sessions} sessions · created by ${v.createdBy}` : undefined}>
      {!v ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="animate-spin text-violet-300" />
        </div>
      ) : (
        <div className="space-y-5 p-4 sm:p-6">
          {v.score && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <div className="rounded-xl bg-violet-500/15 p-3">
                <p className="font-display text-2xl font-bold text-white">{Math.round(v.score.total * 100)}</p>
                <p className="text-[11px] text-[var(--text-muted)]">weighted score</p>
              </div>
              {v.score.components.map((c) => (
                <div key={c.key} className="rounded-xl bg-white/[0.04] p-3" title={c.note}>
                  <p className="font-display text-lg font-bold text-white">{Math.round(c.value * 100)}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {c.label} ×{c.weight.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {v.payload.days.map((d) => (
              <button key={d} onClick={() => setDay(d)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${day === d ? 'bg-white text-[#0b0d1a]' : 'bg-white/5 text-[var(--text-secondary)]'}`}>
                {d}
              </button>
            ))}
          </div>
          <AllSectionsMatrix sessions={v.payload.sessions} days={[v.payload.days.includes(day) ? day : v.payload.days[0]]} onPick={() => {}} />
        </div>
      )}
    </Modal>
  );
}
