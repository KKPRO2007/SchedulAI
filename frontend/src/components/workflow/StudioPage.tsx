import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Crown, Gauge, Loader2, RotateCcw, Save, Send, SlidersHorizontal, Sparkles, XCircle } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import AllSectionsMatrix from '../timetable/AllSectionsMatrix';
import { useAllData } from '../../lib/useData';
import { generateTimetable, loadAssignments, STRATEGIES, type Strategy, type Timetable } from '../../lib/scheduler';
import { checkHardConstraints, DEFAULT_WEIGHTS, loadWeights, saveWeights, scoreTimetable, WEIGHT_LABEL, type HardCheck, type Weights } from '../../lib/scoring';
import { createVersion, logEvent, nextLabel, transition, usePublished, useVersions } from '../../lib/workflow';
import { navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import type { ScoreReport } from '../../lib/types';
import { isLabSubject } from '../../lib/scheduler';

type Candidate = { tt: Timetable; hard: HardCheck[] };

const STRATEGY_ORDER: Strategy[] = ['balanced', 'compact', 'preference'];

export default function StudioPage() {
  const data = useAllData();
  const published = usePublished();
  const versions = useVersions();
  const [weights, setWeights] = useState<Weights>(() => loadWeights());
  const [days, setDays] = useState(5);
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState(0);
  const [matrixDay, setMatrixDay] = useState('Monday');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [showWeights, setShowWeights] = useState(false);

  const previous = published.data?.payload.sessions;
  const ctx = useMemo(() => ({ faculty: data.faculty, rooms: data.rooms, sections: data.sections, previous }), [data.faculty, data.rooms, data.sections, previous]);

  // Scores update live as weights move; hard checks never depend on weights.
  const scored = useMemo(() => candidates.map((c) => ({ ...c, score: scoreTimetable(c.tt, ctx, weights) })), [candidates, ctx, weights]);
  const ranking = useMemo(
    () =>
      scored
        .map((c, i) => ({ i, feasible: c.hard.every((h) => h.passed), total: c.score.total }))
        .sort((a, b) => Number(b.feasible) - Number(a.feasible) || b.total - a.total)
        .map((r) => r.i),
    [scored]
  );

  const quality = useMemo(() => dataQuality(data), [data]);

  function generate() {
    if (!data.ready) return;
    setBusy(true);
    setTimeout(() => {
      const seed = Math.floor(Math.random() * 1e9);
      const list = STRATEGY_ORDER.map((strategy, k) => {
        const tt = generateTimetable({ ...data, assignments: loadAssignments(), days, strategy, seed: seed + k * 101, previous });
        return { tt, hard: checkHardConstraints(tt, data) };
      });
      setCandidates(list);
      const best = list
        .map((c, i) => ({ i, s: scoreTimetable(c.tt, ctx, weights).total, ok: c.hard.every((h) => h.passed) }))
        .sort((a, b) => Number(b.ok) - Number(a.ok) || b.s - a.s)[0].i;
      setSelected(best);
      setLabel(nextLabel(versions.data, `${STRATEGIES[list[best].tt.strategy ?? 'balanced'].label} candidate`));
      setBusy(false);
      const ms = list.reduce((a, c) => a + c.tt.stats.ms, 0);
      logEvent('generated candidates', `3 candidates in ${ms.toFixed(0)} ms (${days}-day week)`);
      toast(`3 candidates generated in ${ms.toFixed(0)} ms`);
    }, 350);
  }

  function updateWeight(k: keyof Weights, v: number) {
    const next = { ...weights, [k]: v };
    setWeights(next);
    saveWeights(next);
  }

  async function save(submit: boolean) {
    const c = scored[selected];
    if (!c) return;
    setSaving(submit ? 'submit' : 'draft');
    try {
      const v = await createVersion(label.trim() || nextLabel(versions.data, 'candidate'), c.tt, c.score as ScoreReport, note.trim() || undefined);
      if (submit) await transition(v.id, 'submitted', note.trim() || undefined);
      toast(submit ? `${v.label} submitted for approval` : `${v.label} saved as draft`);
      navigate('/app/versions');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
    } finally {
      setSaving(null);
    }
  }

  const sel = scored[selected];
  const changed = useMemo(() => {
    if (!sel || !previous?.length) return null;
    const prev = new Set(previous.map((s) => `${s.section}|${s.subjectCode}|${s.day}|${s.start}|${s.facultyEmail}`));
    return sel.tt.sessions.filter((s) => !prev.has(`${s.section}|${s.subjectCode}|${s.day}|${s.start}|${s.facultyEmail}`)).length;
  }, [sel, previous]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Intelligent scheduling"
        title="Generate & compare"
        text="Hard rules are checked first; feasible candidates are then ranked by the weighted soft score. Nothing reaches students until an administrator approves and publishes it."
        actions={
          <button onClick={generate} disabled={busy || !data.ready || data.sections.length === 0} className="btn btn-primary">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {busy ? 'Solving…' : candidates.length ? 'Generate again' : 'Generate 3 candidates'}
          </button>
        }
      />

      {/* Setup row */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Input check</h2>
              <p className="text-sm text-[var(--text-muted)]">Validated before solving (synopsis §4.2)</p>
            </div>
            <span className={`chip ${quality.errors ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'}`}>
              {quality.errors ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
              {quality.errors ? `${quality.errors} warning${quality.errors === 1 ? '' : 's'}` : 'Ready'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Faculty', data.faculty.length],
              ['Rooms', data.rooms.length],
              ['Sections', data.sections.length],
              ['Subjects', data.subjects.length],
            ].map(([l, v]) => (
              <div key={l} className="rounded-md bg-white/[0.03] px-3 py-2.5">
                <p className="text-lg font-semibold text-[var(--text-primary)]">{data.ready ? v : '—'}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{l}</p>
              </div>
            ))}
          </div>
          {quality.items.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-xs text-amber-300">
              {quality.items.slice(0, 5).map((t) => (
                <li key={t} className="flex gap-2">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-300" /> {t}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-2xl p-5 sm:p-6">
          <button onClick={() => setShowWeights((s) => !s)} className="flex w-full items-center justify-between gap-3 text-left">
            <span>
              <span className="block text-lg font-semibold text-[var(--text-primary)] tabular-nums">Rule weights</span>
              <span className="block text-sm text-[var(--text-muted)]">Soft score = Σ weight × component</span>
            </span>
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-brand-300" />
              <ChevronDown size={16} className={`text-[var(--text-muted)] transition lg:hidden ${showWeights ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <div className={`mt-4 space-y-3 ${showWeights ? '' : 'hidden lg:block'}`}>
            {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
              <label key={k} className="block">
                <span className="flex justify-between text-xs text-[var(--text-secondary)]">
                  {WEIGHT_LABEL[k]} <span className="tabular-nums text-[var(--text-primary)]">{weights[k].toFixed(2)}</span>
                </span>
                <input type="range" min={0} max={0.6} step={0.05} value={weights[k]} onChange={(e) => updateWeight(k, Number(e.target.value))} className="mt-1 w-full accent-brand-700" aria-label={WEIGHT_LABEL[k]} />
              </label>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex rounded-md border border-white/10 p-0.5 text-xs font-semibold">
                {[5, 6].map((n) => (
                  <button key={n} onClick={() => setDays(n)} className={`rounded-lg px-3 py-1.5 ${days === n ? 'pill-active' : 'text-[var(--text-muted)]'}`}>
                    {n}-day week
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setWeights(DEFAULT_WEIGHTS);
                  saveWeights(DEFAULT_WEIGHTS);
                }}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                <RotateCcw size={13} /> Synopsis defaults
              </button>
            </div>
          </div>
        </div>
      </section>

      {candidates.length === 0 ? (
        <section className="glass rounded-2xl p-8 text-center sm:p-14">
          <Gauge className="mx-auto text-brand-300" size={36} />
          <h2 className="mt-5 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl tabular-nums">Three strategies, one click</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
            Balanced, Compact and Preference-first candidates are solved in parallel{published.data ? `, each trying to keep the published ${published.data.label} stable` : ''}. Compare the score breakdown, then save the one you want as a draft.
          </p>
          <button onClick={generate} disabled={busy || !data.ready} className="btn btn-primary mt-6 px-6 py-3">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Generate candidates
          </button>
        </section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            {scored.map((c, i) => {
              const rank = ranking.indexOf(i);
              const feasible = c.hard.every((h) => h.passed);
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSelected(i);
                    setLabel(nextLabel(versions.data, `${STRATEGIES[c.tt.strategy ?? 'balanced'].label} candidate`));
                  }}
                  className={`glass relative overflow-hidden rounded-2xl p-5 text-left transition ${selected === i ? 'border-brand-500 ring-2 ring-brand-400/25' : 'hover:border-white/20'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                        {rank === 0 && feasible && <Crown size={13} className="text-amber-300" />} Rank #{rank + 1}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)] tabular-nums">{STRATEGIES[c.tt.strategy ?? 'balanced'].label}</p>
                      <p className="text-xs text-[var(--text-muted)]">{STRATEGIES[c.tt.strategy ?? 'balanced'].text}</p>
                    </div>
                    <ScoreRing value={c.score.total} muted={!feasible} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {c.score.components.map((k) => (
                      <div key={k.key}>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[var(--text-secondary)]">
                            {k.label} <span className="text-[var(--text-muted)]">× {k.weight.toFixed(2)}</span>
                          </span>
                          <span className="tabular-nums text-[var(--text-primary)]">{Math.round(k.value * 100)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full bg-brand-600 transition-all duration-700" style={{ width: `${k.value * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-xs ${feasible ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
                    {feasible ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    Hard constraints {c.hard.filter((h) => h.passed).length}/{c.hard.length} · {c.tt.stats.scheduledHours}/{c.tt.stats.requiredHours}h · {c.tt.stats.ms.toFixed(0)} ms
                  </div>
                </button>
              );
            })}
          </section>

          {sel && (
            <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
              <div className="glass min-w-0 overflow-hidden rounded-2xl">
                <div className="border-b border-white/10 p-5">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">{STRATEGIES[sel.tt.strategy ?? 'balanced'].label} candidate · all sections</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    {sel.tt.sessions.length} sessions{changed !== null ? ` · ${changed} placement${changed === 1 ? '' : 's'} differ from the published version` : ''}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
                    {sel.tt.days.map((d) => (
                      <button key={d} onClick={() => setMatrixDay(d)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${matrixDay === d ? 'pill-active' : 'bg-white/[0.06] text-[var(--text-secondary)]'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <AllSectionsMatrix sessions={sel.tt.sessions} days={[sel.tt.days.includes(matrixDay) ? matrixDay : sel.tt.days[0]]} onPick={() => {}} />
                </div>
              </div>

              <div className="space-y-5">
                <div className="glass rounded-2xl p-5">
                  <h3 className="font-semibold text-[var(--text-primary)] tabular-nums">Why this score</h3>
                  <ul className="mt-3 space-y-2.5 text-xs">
                    {sel.score.components.map((k) => (
                      <li key={k.key} className="flex gap-2">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                        <span className="text-[var(--text-secondary)]">
                          <b className="text-[var(--text-primary)]">{k.label}:</b> {k.note}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <h3 className="mt-5 font-semibold text-[var(--text-primary)] tabular-nums">Hard constraints</h3>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {sel.hard.map((h) => (
                      <li key={h.key}>
                        <span className={`flex items-center gap-2 ${h.passed ? 'text-[var(--text-secondary)]' : 'text-rose-300'}`}>
                          {h.passed ? <CheckCircle2 size={13} className="text-emerald-300" /> : <XCircle size={13} className="text-rose-300" />} {h.label}
                        </span>
                        {!h.passed && <span className="ml-5 block text-[11px] text-rose-300">{h.violations[0]}{h.violations.length > 1 ? ` (+${h.violations.length - 1} more)` : ''}</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass rounded-2xl p-5">
                  <h3 className="font-semibold text-[var(--text-primary)] tabular-nums">Save this candidate</h3>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs text-[var(--text-secondary)]">Version label</span>
                    <input value={label} onChange={(e) => setLabel(e.target.value)} className="form-input" />
                  </label>
                  <label className="mt-3 block">
                    <span className="mb-1 block text-xs text-[var(--text-secondary)]">Note for the approver (optional)</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="form-input resize-none" placeholder="e.g. adds CSE-3C, keeps labs on Tue/Thu" />
                  </label>
                  {!sel.hard.every((h) => h.passed) && <p className="mt-3 text-xs text-amber-300">This candidate breaks a hard rule. It can be saved as a draft for reference but should not be submitted.</p>}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => save(false)} disabled={Boolean(saving)} className="btn btn-ghost">
                      {saving === 'draft' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save draft
                    </button>
                    <button onClick={() => save(true)} disabled={Boolean(saving) || !sel.hard.every((h) => h.passed)} className="btn btn-primary">
                      {saving === 'submit' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ScoreRing({ value, muted }: { value: number; muted?: boolean }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center" aria-label={`Score ${Math.round(value * 100)}`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={muted ? '#a3adbb' : '#285394'} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ transition: 'stroke-dashoffset .8s' }} />
      </svg>
      <span className="absolute text-lg font-semibold text-[var(--text-primary)] tabular-nums">{Math.round(value * 100)}</span>
    </span>
  );
}

function dataQuality(d: ReturnType<typeof useAllData>) {
  const items: string[] = [];
  if (!d.ready) return { items, errors: 0 };
  const key = (dept: string, sem: number) => `${dept.toLowerCase()}|${sem}`;
  const subjectSets = new Set(d.subjects.map((s) => key(s.department, s.semester)));
  const noSubjects = d.sections.filter((s) => !subjectSets.has(key(s.department, s.semester)));
  if (noSubjects.length) items.push(`${noSubjects.length} section${noSubjects.length > 1 ? 's have' : ' has'} no subjects (${noSubjects.slice(0, 3).map((s) => s.name).join(', ')}${noSubjects.length > 3 ? '…' : ''})`);
  const depts = new Set(d.faculty.filter((f) => f.available).map((f) => f.department.toLowerCase()));
  const orphan = [...new Set(d.sections.map((s) => s.department))].filter((x) => !depts.has(x.toLowerCase()));
  if (orphan.length) items.push(`No available faculty in ${orphan.join(', ')}; teachers will be borrowed`);
  const labs = d.rooms.filter((r) => r.type === 'Laboratory' && r.available).length;
  if (d.subjects.some(isLabSubject) && labs === 0) items.push('Lab subjects exist but no laboratory is available');
  const biggest = Math.max(0, ...d.rooms.filter((r) => r.type !== 'Laboratory' && r.available).map((r) => r.capacity));
  const tooBig = d.sections.filter((s) => s.students > biggest);
  if (tooBig.length) items.push(`${tooBig.length} section${tooBig.length > 1 ? 's are' : ' is'} larger than every classroom (${biggest} seats)`);
  const off = d.faculty.filter((f) => !f.available).length;
  if (off) items.push(`${off} faculty member${off > 1 ? 's are' : ' is'} marked unavailable and will not be scheduled`);
  return { items, errors: items.length - (off ? 1 : 0) };
}
