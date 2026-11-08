import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownUp,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Download,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Presentation,
  Rows3,
  Search,
  Trash2,
  UploadCloud,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DEPARTMENT_OPTIONS, ENTITIES, type FieldDef } from '../../lib/entities';
import type { EntityKey, EntityMap, Faculty, Room, Section, Subject } from '../../lib/types';
import { notifyDataChanged, useEntity } from '../../lib/useData';
import { navigate } from '../../lib/router';
import PageHeader from '../ui/PageHeader';
import Modal from '../ui/Modal';
import Tilt from '../fx/Tilt';
import StatCard, { type Tone } from './StatCard';
import { toast } from '../../lib/toast';

type AnyRow = EntityMap[EntityKey] & Record<string, unknown>;

type Column = { key: string; label: string; render: (r: AnyRow) => ReactNode; sort?: (r: AnyRow) => string | number };

const initials = (s: string) =>
  s
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const hueFor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

function Avatar({ text, icon: Icon }: { text: string; icon?: LucideIcon }) {
  const h = hueFor(text);
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ background: `hsl(${h} 60% 60% / 0.16)`, color: `hsl(${h} 75% 78%)` }}
    >
      {Icon ? <Icon size={17} /> : initials(text)}
    </span>
  );
}

function Status({ ok, yes = 'Available', no = 'Unavailable' }: { ok: boolean; yes?: string; no?: string }) {
  return (
    <span className={`chip ${ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-600' : 'bg-amber-500'}`} />
      {ok ? yes : no}
    </span>
  );
}

const roomIcon = (t: string) => (t === 'Laboratory' ? FlaskConical : t === 'Seminar Hall' ? Presentation : DoorOpen);
const isLab = (name: string) => /\blab\b|laboratory|practical|workshop/i.test(name);

const CONFIG: Record<
  EntityKey,
  {
    eyebrow: string;
    title: string;
    text: string;
    columns: Column[];
    stats: (rows: AnyRow[]) => { label: string; value: number; note: string; icon: LucideIcon; tone: Tone; bars?: number[] }[];
    search: (r: AnyRow) => string;
    title_: (r: AnyRow) => string;
    subtitle: (r: AnyRow) => string;
    icon?: (r: AnyRow) => LucideIcon | undefined;
  }
> = {
  faculty: {
    eyebrow: 'People',
    title: 'Faculty',
    text: 'Everyone who can be assigned to teach. Unavailable faculty are skipped by the timetable generator.',
    columns: [
      { key: 'name', label: 'Faculty member', sort: (r) => String(r.name), render: (r) => <Person r={r as unknown as Faculty} /> },
      { key: 'department', label: 'Department', sort: (r) => String(r.department), render: (r) => String(r.department) },
      { key: 'designation', label: 'Designation', sort: (r) => String(r.designation ?? ''), render: (r) => (r.designation as string) || <span className="text-[var(--text-muted)]">—</span> },
      { key: 'maxWorkload', label: 'Load limit', sort: (r) => Number(r.maxWorkload ?? 18), render: (r) => <span className="whitespace-nowrap">{String(r.maxWorkload ?? 18)}h{r.preferredWindow && r.preferredWindow !== 'any' ? <span className="ml-2 chip text-[10px]">{String(r.preferredWindow)}</span> : null}</span> },
      { key: 'available', label: 'Status', sort: (r) => Number(r.available), render: (r) => <Status ok={Boolean(r.available)} /> },
    ],
    stats: (rows) => {
      const f = rows as unknown as Faculty[];
      return [
        { label: 'Total faculty', value: f.length, note: 'Registered members', icon: Users, tone: 'violet', bars: countBy(f, (x) => x.department) },
        { label: 'Available', value: f.filter((x) => x.available).length, note: 'Can be scheduled', icon: CheckCircle2, tone: 'emerald' },
        { label: 'Departments', value: new Set(f.map((x) => x.department)).size, note: 'With at least one member', icon: Building2, tone: 'sky' },
      ];
    },
    search: (r) => `${r.name} ${r.email} ${r.department} ${r.designation ?? ''}`,
    title_: (r) => String(r.name),
    subtitle: (r) => String(r.email),
  },
  rooms: {
    eyebrow: 'Resources',
    title: 'Rooms & Labs',
    text: 'Classrooms, laboratories and seminar halls. Labs host 2-hour practical blocks; capacity decides which section fits where.',
    columns: [
      { key: 'name', label: 'Room', sort: (r) => String(r.name), render: (r) => <Titled icon={roomIcon(String(r.type))} title={String(r.name)} sub={String(r.type)} /> },
      { key: 'building', label: 'Building', sort: (r) => String(r.building), render: (r) => String(r.building) },
      { key: 'capacity', label: 'Capacity', sort: (r) => Number(r.capacity), render: (r) => <Meter value={Number(r.capacity)} max={200} /> },
      { key: 'available', label: 'Status', sort: (r) => Number(r.available), render: (r) => <Status ok={Boolean(r.available)} /> },
    ],
    stats: (rows) => {
      const r = rows as unknown as Room[];
      return [
        { label: 'Total rooms', value: r.length, note: 'Across all buildings', icon: DoorOpen, tone: 'violet', bars: countBy(r, (x) => x.building) },
        { label: 'Laboratories', value: r.filter((x) => x.type === 'Laboratory').length, note: 'For practical sessions', icon: FlaskConical, tone: 'fuchsia' },
        { label: 'Total seats', value: r.reduce((a, x) => a + x.capacity, 0), note: 'Combined capacity', icon: Users, tone: 'sky' },
      ];
    },
    search: (r) => `${r.name} ${r.building} ${r.type}`,
    title_: (r) => String(r.name),
    subtitle: (r) => `${r.type} · ${r.building}`,
    icon: (r) => roomIcon(String(r.type)),
  },
  sections: {
    eyebrow: 'Students',
    title: 'Sections',
    text: 'Student groups. Each section gets every subject of its department and semester in the generated timetable.',
    columns: [
      { key: 'name', label: 'Section', sort: (r) => String(r.name), render: (r) => <Titled icon={GraduationCap} title={String(r.name)} sub={`Semester ${r.semester}`} /> },
      { key: 'department', label: 'Department', sort: (r) => String(r.department), render: (r) => String(r.department) },
      { key: 'students', label: 'Students', sort: (r) => Number(r.students), render: (r) => <Meter value={Number(r.students)} max={90} /> },
      { key: 'shift', label: 'Shift', sort: (r) => String(r.shift), render: (r) => <span className={`chip ${r.shift === 'Shift 2' ? 'text-sky-300' : 'text-brand-300'}`}>{String(r.shift)}</span> },
    ],
    stats: (rows) => {
      const s = rows as unknown as Section[];
      return [
        { label: 'Total sections', value: s.length, note: 'Student groups', icon: GraduationCap, tone: 'violet', bars: countBy(s, (x) => `S${x.semester}`) },
        { label: 'Students', value: s.reduce((a, x) => a + x.students, 0), note: 'Across all sections', icon: Users, tone: 'emerald' },
        { label: 'Departments', value: new Set(s.map((x) => x.department)).size, note: 'Represented', icon: Building2, tone: 'sky' },
      ];
    },
    search: (r) => `${r.name} ${r.department} ${r.shift} sem ${r.semester}`,
    title_: (r) => String(r.name),
    subtitle: (r) => `${r.department} · Sem ${r.semester}`,
    icon: () => GraduationCap,
  },
  subjects: {
    eyebrow: 'Curriculum',
    title: 'Subjects',
    text: 'What gets taught. Weekly hours decide how many sessions the generator places; names with "Lab" become 2-hour practicals.',
    columns: [
      { key: 'name', label: 'Subject', sort: (r) => String(r.name), render: (r) => <Titled icon={isLab(String(r.name)) ? FlaskConical : BookOpen} title={String(r.name)} sub={String(r.code)} mono /> },
      { key: 'department', label: 'Department', sort: (r) => String(r.department), render: (r) => String(r.department) },
      { key: 'semester', label: 'Sem', sort: (r) => Number(r.semester), render: (r) => <span className="chip">S{String(r.semester)}</span> },
      { key: 'credits', label: 'Credits', sort: (r) => Number(r.credits), render: (r) => String(r.credits) },
      { key: 'weeklyHours', label: 'Hours / wk', sort: (r) => Number(r.weeklyHours), render: (r) => <Meter value={Number(r.weeklyHours)} max={6} /> },
    ],
    stats: (rows) => {
      const s = rows as unknown as Subject[];
      return [
        { label: 'Total subjects', value: s.length, note: 'In the catalogue', icon: BookOpen, tone: 'violet', bars: countBy(s, (x) => x.department) },
        { label: 'Weekly hours', value: s.reduce((a, x) => a + x.weeklyHours, 0), note: 'Per section, summed', icon: Clock, tone: 'amber' },
        { label: 'Lab subjects', value: s.filter((x) => isLab(x.name)).length, note: 'Need lab rooms', icon: FlaskConical, tone: 'fuchsia' },
      ];
    },
    search: (r) => `${r.code} ${r.name} ${r.department} sem ${r.semester}`,
    title_: (r) => String(r.name),
    subtitle: (r) => `${r.code} · ${r.department}`,
    icon: (r) => (isLab(String(r.name)) ? FlaskConical : BookOpen),
  },
};

function countBy<T>(list: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  list.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return [...m.values()].sort((a, b) => b - a).slice(0, 14);
}

function Person({ r }: { r: Faculty }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar text={r.name} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--text-primary)]">{r.name}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">{r.email}</p>
      </div>
    </div>
  );
}

function Titled({ icon, title, sub, mono }: { icon: LucideIcon; title: string; sub: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar text={title} icon={icon} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[var(--text-primary)]">{title}</p>
        <p className={`truncate text-xs text-[var(--text-muted)] ${mono ? 'font-mono' : ''}`}>{sub}</p>
      </div>
    </div>
  );
}

function Meter({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-8 tabular-nums text-[var(--text-primary)]">{value}</span>
      <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06] sm:block">
        <span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </span>
    </div>
  );
}

function emptyForm(key: EntityKey): Record<string, string | boolean> {
  const f: Record<string, string | boolean> = {};
  for (const field of ENTITIES[key].fields) {
    if (field.kind === 'bool') f[field.key] = true;
    else if (field.kind === 'select') f[field.key] = field.options?.[0] ?? '';
    else if (field.key === 'capacity') f[field.key] = '60';
    else if (field.key === 'students') f[field.key] = '60';
    else if (field.key === 'semester') f[field.key] = '1';
    else if (field.key === 'credits') f[field.key] = '3';
    else if (field.key === 'weeklyHours') f[field.key] = '3';
    else f[field.key] = '';
  }
  return f;
}

function toCsv(key: EntityKey, rows: AnyRow[]) {
  const fields = ENTITIES[key].fields.map((f) => f.key);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [ENTITIES[key].fields.map((f) => f.label).join(','), ...rows.map((r) => fields.map((k) => esc(r[k])).join(','))].join('\n');
}

export default function EntityPage({ entity, readOnly = false }: { entity: EntityKey; readOnly?: boolean }) {
  const def = ENTITIES[entity];
  const cfg = CONFIG[entity];
  const { rows: data, setRows, error } = useEntity(entity);
  const rows = useMemo(() => (data ?? []) as AnyRow[], [data]);

  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('All');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: cfg.columns[0].key, dir: 1 });
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [editing, setEditing] = useState<AnyRow | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean> | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const departments = useMemo(() => ['All', ...[...new Set(rows.map((r) => String(r.department ?? '')).filter(Boolean))].sort()], [rows]);

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    const col = cfg.columns.find((c) => c.key === sort.key);
    return rows
      .filter((r) => (dept === 'All' || r.department === dept) && (!q || cfg.search(r).toLowerCase().includes(q)))
      .sort((a, b) => {
        if (!col?.sort) return 0;
        const x = col.sort(a);
        const y = col.sort(b);
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * sort.dir;
      });
  }, [rows, query, dept, sort, cfg]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm(entity));
    setFormError('');
  }

  function openEdit(r: AnyRow) {
    const f = emptyForm(entity);
    for (const field of def.fields) {
      const v = r[field.key];
      f[field.key] = field.kind === 'bool' ? Boolean(v) : v === null || v === undefined ? '' : String(v);
    }
    setEditing(r);
    setForm(f);
    setFormError('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const payload: Record<string, unknown> = {};
    for (const field of def.fields) {
      const v = form[field.key];
      payload[field.key] = field.kind === 'number' ? Number(v) : v;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.put<AnyRow>(`/${entity}/${editing.id}`, payload);
        setRows((list) => (list ?? []).map((r) => (r.id === editing.id ? updated : r)) as never);
        toast(`${def.singular[0].toUpperCase()}${def.singular.slice(1)} updated`);
      } else {
        const created = await api.post<AnyRow>(`/${entity}`, payload);
        setRows((list) => [...(list ?? []), created] as never);
        toast(`${def.singular[0].toUpperCase()}${def.singular.slice(1)} added`);
      }
      setForm(null);
      notifyDataChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: AnyRow) {
    if (!window.confirm(`Delete ${cfg.title_(r)}? This cannot be undone.`)) return;
    try {
      await api.delete(`/${entity}/${r.id}`);
      setRows((list) => (list ?? []).filter((x) => x.id !== r.id) as never);
      toast(`Deleted ${cfg.title_(r)}`, 'info');
      notifyDataChanged();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete', 'error');
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(entity, visible)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schedulai-${entity}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stats = cfg.stats(rows);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={cfg.eyebrow}
        title={cfg.title}
        text={cfg.text}
        actions={
          readOnly ? (
            <span className="chip px-3 py-1.5 text-xs">View only</span>
          ) : (
          <>
            <button onClick={() => navigate('/app/import')} className="btn btn-ghost">
              <UploadCloud size={17} /> Import file
            </button>
            <button onClick={openNew} className="btn btn-primary">
              <Plus size={17} /> Add {def.singular}
            </button>
          </>
          )
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={data ? s.value : null} note={s.note} icon={s.icon} tone={s.tone} bars={s.bars} />
        ))}
      </section>

      <section className="glass overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {departments.length <= 7 && departments.map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${dept === d ? 'pill-active' : 'bg-white/[0.06] text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'}`}
              >
                {d}
              </button>
            ))}
            {departments.length > 7 && (
              <select value={dept} onChange={(e) => setDept(e.target.value)} className="form-input w-auto py-1.5 text-xs">
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full lg:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${def.label.toLowerCase()}…`} className="form-input py-2 pl-9" aria-label={`Search ${def.label}`} />
            </div>
            <div className="hidden rounded-md sm:flex border border-white/10 p-0.5">
              <button onClick={() => setView('table')} className={`icon-btn ${view === 'table' ? 'bg-white/[0.06] text-[var(--text-primary)]' : ''}`} aria-label="Table view" title="Table view">
                <Rows3 size={16} />
              </button>
              <button onClick={() => setView('cards')} className={`icon-btn ${view === 'cards' ? 'bg-white/[0.06] text-[var(--text-primary)]' : ''}`} aria-label="Card view" title="Card view">
                <LayoutGrid size={16} />
              </button>
            </div>
            <button onClick={exportCsv} className="icon-btn border border-white/10" aria-label="Export CSV" title="Export as CSV">
              <Download size={16} />
            </button>
          </div>
        </div>

        <p className="px-5 pt-4 text-xs text-[var(--text-muted)]">
          {!data && !error && 'Loading…'}
          {error && <span className="text-rose-300">{error}</span>}
          {data && `${visible.length} of ${rows.length} ${def.label.toLowerCase()}`}
        </p>

        {view === 'table' && (
          <div className="hidden overflow-x-auto pb-2 sm:block">
            <table className="data-table w-full min-w-[720px]">
              <thead>
                <tr>
                  {cfg.columns.map((c) => (
                    <th key={c.key}>
                      <button
                        onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (-s.dir as 1 | -1) : 1 }))}
                        className={`inline-flex items-center gap-1.5 uppercase transition hover:text-[var(--text-primary)] ${sort.key === c.key ? 'text-brand-300' : ''}`}
                      >
                        {c.label} <ArrowDownUp size={11} />
                      </button>
                    </th>
                  ))}
                  {!readOnly && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {!data &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {cfg.columns.map((c) => (
                        <td key={c.key}>
                          <span className="skeleton block h-4 w-24" />
                        </td>
                      ))}
                      <td />
                    </tr>
                  ))}
                {visible.map((r, i) => (
                  <tr key={r.id} style={{ animation: `fade-up .5s ${Math.min(i, 20) * 25}ms both` }}>
                    {cfg.columns.map((c) => (
                      <td key={c.key}>{c.render(r)}</td>
                    ))}
                    {!readOnly && (
                    <td className="whitespace-nowrap text-right">
                      <button onClick={() => openEdit(r)} className="icon-btn hover:text-sky-300" aria-label={`Edit ${cfg.title_(r)}`} title="Edit">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(r)} className="icon-btn hover:text-rose-300" aria-label={`Delete ${cfg.title_(r)}`} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(
          <div className={`grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5 xl:grid-cols-3 ${view === 'table' ? 'sm:hidden' : ''}`}>
            {visible.map((r) => (
              <Tilt key={r.id} className="card group rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Avatar text={cfg.title_(r)} icon={cfg.icon?.(r)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--text-primary)]">{cfg.title_(r)}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">{cfg.subtitle(r)}</p>
                  </div>
                  <div className={`flex transition sm:opacity-0 sm:group-hover:opacity-100 ${readOnly ? "hidden" : ""}`}>
                    <button onClick={() => openEdit(r)} className="icon-btn" aria-label="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => remove(r)} className="icon-btn hover:text-rose-300" aria-label="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:flex sm:flex-wrap sm:gap-2">
                  {cfg.columns.slice(1).map((c) => (
                    <div key={c.key} className="min-w-0 rounded-md bg-white/[0.03] px-2.5 py-1.5 text-xs sm:px-3 sm:py-2">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{c.label}</p>
                      <div className="mt-1 text-[var(--text-secondary)]">{c.render(r)}</div>
                    </div>
                  ))}
                </div>
              </Tilt>
            ))}
          </div>
        )}

        {data && visible.length === 0 && (
          <div className="px-5 py-16 text-center">
            <Search size={30} className="mx-auto text-[var(--text-muted)]" />
            <p className="mt-3 font-semibold text-[var(--text-primary)]">Nothing here yet</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Try another search, add a {def.singular}, or import a file.</p>
          </div>
        )}
      </section>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={editing ? `Edit ${def.singular}` : `Add ${def.singular}`}
        subtitle={editing ? cfg.title_(editing) : 'Fill in the details below.'}
      >
        {form && (
          <form onSubmit={save} className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {def.fields.map((field) => (
                <FieldInput key={field.key} field={field} value={form[field.key]} onChange={(v) => setForm({ ...form, [field.key]: v })} />
              ))}
            </div>
            {formError && <p className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-300">{formError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldDef; value: string | boolean; onChange: (v: string | boolean) => void }) {
  const wide = field.key === 'name' || field.key === 'email';
  if (field.kind === 'bool') {
    return (
      <label className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-4 py-3 sm:col-span-2">
        <span className="text-sm text-[var(--text-secondary)]">{field.label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          onClick={() => onChange(!value)}
          className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-brand-600' : 'bg-white/10'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </label>
    );
  }
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
        {field.label}
        {field.required && <span className="text-brand-300"> *</span>}
      </span>
      {field.kind === 'select' ? (
        <select value={String(value)} onChange={(e) => onChange(e.target.value)} className="form-input">
          {field.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <>
          <input
            required={field.required}
            type={field.kind === 'number' ? 'number' : field.kind === 'email' ? 'email' : 'text'}
            min={field.min}
            max={field.max}
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            list={field.key === 'department' ? 'dept-options' : undefined}
            className="form-input"
          />
          {field.key === 'department' && (
            <datalist id="dept-options">
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          )}
        </>
      )}
    </label>
  );
}
