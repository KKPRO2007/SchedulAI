import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FolderOpen,
  Loader2,
  PackagePlus,
  Rocket,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Tilt from '../fx/Tilt';
import FilePreview from './FilePreview';
import { ConfidenceRing, EntityDot, FileBadge } from './visuals';
import { ENTITY_COLOR, ENTITY_LABEL, fmtSize } from '../../lib/import/entityStyle';
import { ACCEPTED, parseBuffer } from '../../lib/import/parseFile';
import { analyzeFile, buildPlan, type ParsedFile, type PlannedRow } from '../../lib/import/detect';
import { DEMO_FILES, demoUrl } from '../../lib/import/demoFiles';
import { ENTITIES, ENTITY_ORDER } from '../../lib/entities';
import type { BulkResult, EntityKey } from '../../lib/types';
import { api } from '../../lib/api';
import { notifyDataChanged, useAllData } from '../../lib/useData';
import { clearTimetable, saveAssignments } from '../../lib/scheduler';
import { navigate } from '../../lib/router';
import { toast } from '../../lib/toast';
import { buildDemoCampus } from '../../lib/seed';

type Phase = 'idle' | 'importing' | 'done';

async function readFile(file: File | { name: string; buffer: ArrayBuffer; size: number }, demo = false): Promise<ParsedFile> {
  const t0 = performance.now();
  const buffer = 'buffer' in file ? file.buffer : await file.arrayBuffer();
  const size = 'buffer' in file ? file.size : file.size;
  const sheets = await parseBuffer(file.name, buffer);
  return analyzeFile(file.name, size, sheets, performance.now() - t0, demo);
}

export default function ImportPage() {
  const existing = useAllData();
  const [queue, setQueue] = useState<ParsedFile[]>([]);
  const [preview, setPreview] = useState<ParsedFile | null>(null);
  const [loading, setLoading] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<EntityKey>('faculty');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<Partial<Record<EntityKey, BulkResult | 'running'>>>({});
  const [failures, setFailures] = useState<string[]>([]);
  const [replaceChoice, setReplaceChoice] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const plan = useMemo(() => buildPlan(queue), [queue]);
  // Default to a fresh start when only demo files are queued, so the demo doesn't mix with sample data.
  const replace = replaceChoice ?? (queue.length > 0 && queue.every((f) => f.demo));

  const existingKeys = useMemo(() => {
    const m: Record<EntityKey, Set<string>> = { faculty: new Set(), rooms: new Set(), sections: new Set(), subjects: new Set() };
    ENTITY_ORDER.forEach((k) => {
      const list = existing[k] as unknown as Record<string, unknown>[];
      list.forEach((r) => m[k].add(String(r[ENTITIES[k].uniqueKey] ?? '').toLowerCase()));
    });
    return m;
  }, [existing]);

  const totals = useMemo(() => {
    const t = { valid: 0, errors: 0, inferred: 0, updates: 0 };
    ENTITY_ORDER.forEach((k) =>
      plan.rows[k].forEach((r) => {
        if (r.error) t.errors++;
        else t.valid++;
        t.inferred += r.inferred.length;
        if (!replace && existingKeys[k].has(String(r.data[ENTITIES[k].uniqueKey] ?? '').toLowerCase())) t.updates++;
      })
    );
    return t;
  }, [plan, existingKeys, replace]);

  const addFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setPhase('idle');
    setLoading((l) => [...l, ...files.map((f) => f.name)]);
    const results = await Promise.allSettled(files.map((f) => readFile(f)));
    const ok: ParsedFile[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') ok.push(r.value);
      else toast(`${files[i].name}: ${r.reason instanceof Error ? r.reason.message : 'could not be read'}`, 'error');
    });
    setLoading((l) => l.filter((n) => !files.some((f) => f.name === n)));
    setQueue((q) => [...q, ...ok]);
    if (ok.length) {
      const found = ok.flatMap((f) => f.sheets).filter((s) => s.mappings.length).length;
      toast(`${ok.length} file${ok.length > 1 ? 's' : ''} read · ${found} sheet${found === 1 ? '' : 's'} recognised`);
      if (ok.length === 1) setPreview(ok[0]);
    }
  }, []);

  async function openDemo(name: string, add = false) {
    const already = queue.find((f) => f.name === name && f.demo);
    if (already) {
      if (!add) setPreview(already);
      return already;
    }
    setLoading((l) => [...l, name]);
    try {
      const res = await fetch(demoUrl(name));
      if (!res.ok) throw new Error('not found');
      const buffer = await res.arrayBuffer();
      const parsed = await readFile({ name, buffer, size: buffer.byteLength }, true);
      if (add) setQueue((q) => (q.some((f) => f.name === name && f.demo) ? q : [...q, parsed]));
      else setPreview(parsed);
      return parsed;
    } catch {
      toast(`Could not open ${name}`, 'error');
    } finally {
      setLoading((l) => l.filter((n) => n !== name));
    }
  }

  async function addAllDemos() {
    setPhase('idle');
    await Promise.all(DEMO_FILES.map((d) => openDemo(d.name, true)));
    toast(`All ${DEMO_FILES.length} demo files added`);
  }

  function addToQueue(f: ParsedFile) {
    setPhase('idle');
    setQueue((q) => (q.some((x) => x.id === f.id) ? q : [...q, f]));
  }
  function removeFromQueue(f: ParsedFile) {
    setQueue((q) => q.filter((x) => x.id !== f.id));
    setPreview(null);
  }
  function updateFile(f: ParsedFile) {
    setQueue((q) => q.map((x) => (x.id === f.id ? f : x)));
    setPreview(f);
  }

  async function runImport() {
    setPhase('importing');
    setFailures([]);
    setProgress({});
    const fails: string[] = [];
    for (const k of ENTITY_ORDER) {
      const rows = plan.rows[k].filter((r) => !r.error).map((r) => r.data);
      if (!rows.length) continue;
      setProgress((p) => ({ ...p, [k]: 'running' }));
      try {
        const res = await api.post<BulkResult>(`/${k}/bulk`, { rows, replace });
        setProgress((p) => ({ ...p, [k]: res }));
        res.errors.slice(0, 3).forEach((e) => fails.push(`${ENTITY_LABEL[k]} row ${e.index + 1}: ${e.error}`));
      } catch (e) {
        fails.push(`${ENTITY_LABEL[k]}: ${e instanceof Error ? e.message : 'failed'}`);
        setProgress((p) => {
          const next = { ...p };
          delete next[k];
          return next;
        });
      }
    }
    if (replace) {
      clearTimetable();
    }
    if (plan.assignments.length) saveAssignments(plan.assignments);
    setFailures(fails);
    setPhase('done');
    notifyDataChanged();
    toast(fails.length ? 'Import finished with some issues' : 'Import complete', fails.length ? 'info' : 'success');
  }

  async function loadDemoCampus() {
    const campus = buildDemoCampus();
    try {
      for (const k of ENTITY_ORDER) await api.post(`/${k}/bulk`, { rows: campus[k] });
      notifyDataChanged();
      toast(`Demo campus loaded: ${campus.faculty.length} faculty, ${campus.rooms.length} rooms, ${campus.sections.length} sections, ${campus.subjects.length} subjects`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load demo campus', 'error');
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles([...e.dataTransfer.files]);
  };

  const done = phase === 'done';
  const resultTotals = Object.values(progress).reduce(
    (a, r) => (r && r !== 'running' ? { inserted: a.inserted + r.inserted, updated: a.updated + r.updated } : a),
    { inserted: 0, updated: 0 }
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Smart import"
        title={
          <>
            Drop files. <span className="text-gradient">Get a campus.</span>
          </>
        }
        text="Excel, CSV, ODS, JSON, with any file name and any column names. SchedulAI reads the headers, works out what each sheet is, fills in what's missing and shows you everything before saving."
        actions={
          <button onClick={loadDemoCampus} className="btn btn-ghost">
            <PackagePlus size={17} /> Load demo campus
          </button>
        }
      />

      {/* Drop zone */}
      <Tilt max={3} glare={false} className="rounded-[2rem]">
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            dragDepth.current++;
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => {
            dragDepth.current--;
            if (dragDepth.current <= 0) setDragging(false);
          }}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload files"
          className={`glass group relative cursor-pointer overflow-hidden rounded-[2rem] p-6 text-center transition-all duration-300 sm:p-14 ${dragging ? 'scale-[1.01] border-violet-400/70 shadow-[0_0_80px_-10px_rgba(124,92,255,0.8)]' : ''}`}
        >
          <div className="grid-fade absolute inset-0 opacity-60" />
          <svg className="pointer-events-none absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]" aria-hidden="true">
            <rect x="1" y="1" width="99.5%" height="99.2%" rx="26" fill="none" stroke={dragging ? '#a78bfa' : 'rgba(148,163,255,0.25)'} strokeWidth="1.5" strokeDasharray="10 10" className={dragging ? 'animate-[dash_1s_linear_infinite]' : ''} />
          </svg>
          <div className="relative">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="absolute inset-0 animate-pulse-ring rounded-full border border-violet-400/50" />
              <span className="absolute inset-0 animate-pulse-ring rounded-full border border-sky-400/40" style={{ animationDelay: '1.1s' }} />
              <span className="relative flex h-20 w-20 animate-float items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 text-white shadow-[0_20px_50px_-10px_rgba(124,92,255,0.9)]">
                <UploadCloud size={36} />
              </span>
            </div>
            <h3 className="font-display mt-7 text-2xl font-bold text-white sm:text-3xl">{dragging ? 'Release to analyse' : 'Drag & drop your files here'}</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">or click to browse · multiple files and multi-sheet workbooks welcome</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {ACCEPTED.split(',').map((x) => (
                <span key={x} className="chip font-mono">{x}</span>
              ))}
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
        </div>
      </Tilt>
      <style>{`@keyframes dash{to{stroke-dashoffset:-20}}`}</style>

      {/* Demo files */}
      <section>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Try it now</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-white">Demo files</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Click a file to open it and see how each column is detected.</p>
          </div>
          <button onClick={addAllDemos} className="btn btn-ghost">
            <Wand2 size={16} /> Add all demo files
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DEMO_FILES.map((d, i) => {
            const ext = d.name.split('.').pop()!.toLowerCase();
            const queued = queue.some((f) => f.name === d.name && f.demo);
            const busy = loading.includes(d.name);
            return (
              <Tilt key={d.name} as="article" onClick={() => openDemo(d.name)} className="glass group cursor-pointer rounded-3xl p-5" style={{ animation: `fade-up .6s ${i * 70}ms both` }}>
                <div className="flex items-start gap-4" style={{ transform: 'translateZ(35px)' }}>
                  <div className="transition duration-500 group-hover:-rotate-6 group-hover:scale-110">
                    <FileBadge ext={ext} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white" title={d.name}>{d.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{d.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2" style={{ transform: 'translateZ(20px)' }}>
                  <div className="flex flex-wrap gap-1.5">
                    {d.tags.map((t) => (
                      <span key={t} className="chip text-[10px]">{t}</span>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {queued && <CheckCircle2 size={16} className="text-emerald-400" aria-label="Added" />}
                    <a href={demoUrl(d.name)} download onClick={(e) => e.stopPropagation()} className="icon-btn" aria-label={`Download ${d.name}`} title="Download">
                      <Download size={15} />
                    </a>
                    <span className="icon-btn text-violet-200">{busy ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}</span>
                  </div>
                </div>
              </Tilt>
            );
          })}
        </div>
      </section>

      {/* Queue */}
      {(queue.length > 0 || loading.length > 0) && (
        <section className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Step 2</p>
              <h2 className="font-display mt-1 text-xl font-bold text-white">Files in this import</h2>
            </div>
            {queue.length > 0 && (
              <button onClick={() => { setQueue([]); setPhase('idle'); }} className="btn btn-ghost px-3 py-2 text-xs">
                <X size={14} /> Clear
              </button>
            )}
          </div>
          <div className="mt-5 space-y-3">
            {queue.map((f) => (
              <div key={f.id} className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition hover:border-white/15 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <FileBadge ext={f.ext} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{f.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {fmtSize(f.size)} · {f.sheets.length} sheet{f.sheets.length === 1 ? '' : 's'} · {f.parseMs.toFixed(0)} ms
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {f.sheets.map((s) => (
                    <span key={s.name} className="chip text-[11px]" title={`${s.name}: ${s.body.length} rows`}>
                      {s.primary ? <EntityDot entity={s.primary} /> : <AlertTriangle size={11} className="text-amber-300" />}
                      {s.name} → {s.primary ? ENTITY_LABEL[s.primary] : 'skipped'}
                      {s.mappings.filter((m) => m.derived).map((m) => ` + ${ENTITY_LABEL[m.entity]}`)}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {f.sheets[0] && <ConfidenceRing value={Math.max(...f.sheets.map((s) => s.confidence))} size={38} />}
                  <button onClick={() => setPreview(f)} className="icon-btn" aria-label={`Open ${f.name}`} title="Open">
                    <FolderOpen size={17} />
                  </button>
                  <button onClick={() => removeFromQueue(f)} className="icon-btn hover:text-rose-300" aria-label={`Remove ${f.name}`} title="Remove">
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
            {loading.map((n) => (
              <div key={n} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <Loader2 size={20} className="animate-spin text-violet-300" />
                <span className="shimmer-text text-sm font-medium">Reading {n}…</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review */}
      {queue.length > 0 && (
        <section className="glass overflow-hidden rounded-3xl">
          <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Step 3</p>
              <h2 className="font-display mt-1 text-xl font-bold text-white">Review before saving</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {plan.sheetsUsed} sheets · {plan.cellsScanned.toLocaleString()} cells scanned · {totals.inferred} values filled in · duplicates merged
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-[var(--text-secondary)]" title="Deletes current records of each type before importing">
              <input type="checkbox" checked={replace} onChange={(e) => setReplaceChoice(e.target.checked)} className="h-4 w-4 accent-violet-500" />
              Replace existing data
            </label>
            <button onClick={runImport} disabled={phase === 'importing' || totals.valid === 0} className="btn btn-primary px-6 py-3">
              {phase === 'importing' ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
              {phase === 'importing' ? 'Importing…' : `Import ${totals.valid} records`}
            </button>
            </div>
          </div>

          <div className="grid gap-3 px-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
            {ENTITY_ORDER.map((k) => {
              const rows = plan.rows[k];
              const errs = rows.filter((r) => r.error).length;
              const upd = rows.filter((r) => !replace && existingKeys[k].has(String(r.data[ENTITIES[k].uniqueKey] ?? '').toLowerCase())).length;
              const prog = progress[k];
              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${tab === k ? 'border-white/20 bg-white/[0.06]' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}
                >
                  <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: ENTITY_COLOR[k], opacity: tab === k ? 1 : 0.4 }} />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-semibold text-white">
                      <EntityDot entity={k} /> {ENTITY_LABEL[k]}
                    </span>
                    {prog === 'running' && <Loader2 size={15} className="animate-spin text-violet-300" />}
                    {prog && prog !== 'running' && <CheckCircle2 size={16} className="text-emerald-400" />}
                  </div>
                  <p className="font-display mt-2 text-3xl font-bold text-white">{rows.length}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {prog && prog !== 'running' ? `${prog.inserted} added · ${prog.updated} updated` : `${rows.length - upd - errs} new · ${upd} update${errs ? ` · ${errs} with errors` : ''}`}
                  </p>
                </button>
              );
            })}
          </div>

          <PlanTable rows={plan.rows[tab]} entity={tab} existing={replace ? new Set<string>() : existingKeys[tab]} />
        </section>
      )}

      {/* Result */}
      {done && (
        <section className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{ animation: 'fade-up .6s both' }}>
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.25),transparent_60%)]" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 size={28} />
              </span>
              <div>
                <h3 className="font-display text-2xl font-bold text-white">
                  {resultTotals.inserted} added, {resultTotals.updated} updated
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {plan.assignments.length > 0 ? `${plan.assignments.length} teaching allocations saved and will be used by the timetable generator. ` : ''}
                  Your data is ready to schedule.
                </p>
                {failures.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-amber-200">
                    {failures.map((f) => (
                      <li key={f} className="flex items-center gap-2"><AlertTriangle size={12} /> {f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button onClick={() => navigate('/app/timetable?generate=1')} className="btn btn-primary px-6 py-3">
              <Sparkles size={18} /> Generate timetable <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      <FilePreview
        key={preview?.id}
        file={preview}
        inQueue={Boolean(preview && queue.some((f) => f.id === preview.id))}
        onClose={() => setPreview(null)}
        onAdd={addToQueue}
        onRemove={removeFromQueue}
        onChange={(f) => (queue.some((x) => x.id === f.id) ? updateFile(f) : setPreview(f))}
      />
    </div>
  );
}

function PlanTable({ rows, entity, existing }: { rows: PlannedRow[]; entity: EntityKey; existing: Set<string> }) {
  const fields = ENTITIES[entity].fields;
  const [onlyIssues, setOnlyIssues] = useState(false);
  const shown = (onlyIssues ? rows.filter((r) => r.error || r.inferred.length) : rows).slice(0, 300);

  if (rows.length === 0) {
    return <p className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">No {ENTITY_LABEL[entity].toLowerCase()} found in these files.</p>;
  }
  return (
    <div className="mt-5 border-t border-white/5">
      <div className="flex items-center justify-between px-5 py-3 text-xs text-[var(--text-muted)] sm:px-6">
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-violet-300" /> filled in automatically</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" /> updates an existing record</span>
        </span>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} className="accent-violet-500" />
          Only rows with filled-in values or errors
        </label>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="data-table w-full min-w-[760px]">
          <thead className="sticky top-0 bg-[#0d1022]">
            <tr>
              <th></th>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const isUpdate = existing.has(String(r.data[ENTITIES[entity].uniqueKey] ?? '').toLowerCase());
              return (
                <tr key={i} className={r.error ? 'bg-rose-500/[0.06]' : ''}>
                  <td className="w-8">
                    {r.error ? (
                      <AlertTriangle size={15} className="text-rose-300" aria-label={r.error} />
                    ) : isUpdate ? (
                      <span className="block h-2 w-2 rounded-full bg-sky-400" title="Updates an existing record" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-emerald-400" title="New record" />
                    )}
                  </td>
                  {fields.map((f) => {
                    const v = r.data[f.key];
                    const inferred = r.inferred.includes(f.key);
                    return (
                      <td key={f.key} className={inferred ? 'text-violet-200' : 'text-white'}>
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          {inferred && <Sparkles size={11} className="text-violet-300" />}
                          {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v === null || v === undefined || v === '' ? <span className="text-[var(--text-muted)]">—</span> : String(v)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="max-w-[260px] truncate text-[11px] text-[var(--text-muted)]" title={r.error ?? r.source}>
                    {r.error ? <span className="text-rose-300">{r.error}</span> : r.source}
                    {r.merged > 0 && <span className="ml-1 text-sky-300">(+{r.merged} merged)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > shown.length && !onlyIssues && <p className="p-3 text-center text-xs text-[var(--text-muted)]">Showing 300 of {rows.length}</p>}
      </div>
    </div>
  );
}
