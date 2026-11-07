import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  FlaskConical,
  GraduationCap,
  PackagePlus,
  Sparkles,
  TriangleAlert,
  UploadCloud,
  Users,
} from 'lucide-react';
import StatCard from './StatCard';
import Tilt from '../fx/Tilt';
import { useAllData, notifyDataChanged } from '../../lib/useData';
import { useSession } from '../../lib/auth';
import { navigate } from '../../lib/router';
import { fmtHour, type Session } from '../../lib/scheduler';
import { usePublished, useRequests, useVersions, STATUS_STYLE } from '../../lib/workflow';
import { api } from '../../lib/api';
import { buildDemoCampus } from '../../lib/seed';
import { ENTITY_ORDER } from '../../lib/entities';
import { toast } from '../../lib/toast';

const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function groupCount<T>(list: T[], key: (x: T) => string) {
  const m = new Map<string, number>();
  list.forEach((x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default function Overview() {
  const d = useAllData();
  const session = useSession();
  const published = usePublished();
  const tt = published.data?.payload ?? null;
  const versions = useVersions();
  const requests = useRequests();
  const firstName = (session?.user.name ?? 'Admin').split(' ')[0];

  const today = useMemo(() => {
    if (!tt) return { day: '', list: [] as Session[] };
    const name = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const day = tt.days.includes(name) ? name : tt.days[0];
    return { day, list: tt.sessions.filter((s) => s.day === day).sort((a, b) => a.start - b.start) };
  }, [tt]);

  const facultyByDept = useMemo(() => groupCount(d.faculty, (f) => f.department).slice(0, 6), [d.faculty]);
  const roomMix = useMemo(() => {
    const types = ['Classroom', 'Laboratory', 'Seminar Hall'] as const;
    return types.map((t) => ({ type: t, count: d.rooms.filter((r) => r.type === t).length, seats: d.rooms.filter((r) => r.type === t).reduce((a, r) => a + r.capacity, 0) }));
  }, [d.rooms]);
  const loadByDay = useMemo(() => (tt ? tt.days.map((day) => ({ day, hours: tt.sessions.filter((s) => s.day === day).reduce((a, s) => a + s.duration, 0) })) : []), [tt]);

  async function loadDemo() {
    const campus = buildDemoCampus();
    try {
      for (const k of ENTITY_ORDER) await api.post(`/${k}/bulk`, { rows: campus[k] });
      notifyDataChanged();
      toast('Demo campus loaded');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load demo data', 'error');
    }
  }

  const ready = d.ready;
  const placed = tt?.stats.scheduledHours ?? 0;
  const required = tt?.stats.requiredHours ?? 0;

  return (
    <div className="space-y-7">
      {/* Hero */}
      <section className="glass relative animate-fade-up overflow-hidden rounded-3xl p-5 sm:rounded-[2rem] sm:p-9">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(124,92,255,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(34,184,240,0.18),transparent_55%)]" />
        <div className="grid-fade absolute inset-0 -z-10 opacity-70" />
        <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="font-display mt-3 text-3xl font-bold text-white sm:text-5xl">
              {greeting()}, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="mt-3 max-w-xl text-[var(--text-secondary)]">
              {tt
                ? `Your timetable covers ${tt.stats.sections} sections with ${tt.sessions.length} sessions a week. ${tt.unscheduled.length ? `${tt.unscheduled.length} items still need a slot.` : 'Every required hour is placed.'}`
                : 'Import your spreadsheets or load the demo campus, then generate a timetable in one click.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:w-[560px]">
            {[
              { icon: UploadCloud, title: 'Import files', text: 'Excel, CSV, ODS, JSON', go: () => navigate('/app/import') },
              { icon: Sparkles, title: 'Generate', text: 'Scored candidates', go: () => navigate('/app/studio') },
              { icon: PackagePlus, title: 'Demo campus', text: 'Load sample data', go: loadDemo },
            ].map((a) => (
              <Tilt key={a.title} as="button" onClick={a.go} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left sm:p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-400 text-white shadow-lg transition group-hover:scale-110" style={{ transform: 'translateZ(30px)' }}>
                  <a.icon size={19} />
                </span>
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-white sm:text-sm">
                  {a.title} <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </p>
                <p className="hidden text-xs text-[var(--text-muted)] sm:block">{a.text}</p>
              </Tilt>
            ))}
          </div>
        </div>
      </section>

      {/* Counts */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Faculty" value={ready ? d.faculty.length : null} note={`${d.faculty.filter((f) => f.available).length} available`} icon={Users} tone="violet" bars={facultyByDept.map((x) => x[1])} onClick={() => navigate('/app/faculty')} />
        <StatCard label="Rooms & Labs" value={ready ? d.rooms.length : null} note={`${d.rooms.reduce((a, r) => a + r.capacity, 0).toLocaleString()} seats`} icon={DoorOpen} tone="sky" bars={groupCount(d.rooms, (r) => r.building).map((x) => x[1])} onClick={() => navigate('/app/rooms')} />
        <StatCard label="Sections" value={ready ? d.sections.length : null} note={`${d.sections.reduce((a, s) => a + s.students, 0).toLocaleString()} students`} icon={GraduationCap} tone="emerald" bars={groupCount(d.sections, (s) => String(s.semester)).map((x) => x[1])} onClick={() => navigate('/app/sections')} />
        <StatCard label="Subjects" value={ready ? d.subjects.length : null} note={`${d.subjects.reduce((a, s) => a + s.weeklyHours, 0)} weekly hours`} icon={BookOpen} tone="fuchsia" bars={groupCount(d.subjects, (s) => s.department).map((x) => x[1])} onClick={() => navigate('/app/subjects')} />
      </section>

      {/* Workflow status (synopsis §10.1) */}
      <section className="grid gap-4 md:grid-cols-3">
        <button onClick={() => navigate('/app/timetable')} className="glass rounded-3xl p-5 text-left transition hover:border-white/25">
          <p className="eyebrow text-emerald-300">Published</p>
          <p className="font-display mt-2 truncate text-lg font-bold text-white">{published.data?.label ?? 'Nothing published'}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {published.data?.score ? `Score ${Math.round(published.data.score.total * 100)} · ${published.data.score.hardPassed}/${published.data.score.hardTotal} hard rules` : 'Generate and approve a version'}
          </p>
        </button>
        <button onClick={() => navigate('/app/versions')} className="glass rounded-3xl p-5 text-left transition hover:border-white/25">
          <p className="eyebrow">Awaiting approval</p>
          <p className="font-display mt-2 text-3xl font-bold text-white">{versions.data ? versions.data.filter((v) => v.status === 'submitted').length : '—'}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs text-[var(--text-muted)]">
            {(['draft', 'approved'] as const).map((s) => (
              <span key={s} className={`chip ${STATUS_STYLE[s].chip}`}>
                {versions.data?.filter((v) => v.status === s).length ?? 0} {STATUS_STYLE[s].label.toLowerCase()}
              </span>
            ))}
          </p>
        </button>
        <button onClick={() => navigate('/app/requests')} className="glass rounded-3xl p-5 text-left transition hover:border-white/25">
          <p className="eyebrow text-amber-200">Open requests</p>
          <p className="font-display mt-2 text-3xl font-bold text-white">{requests.data ? requests.data.filter((r) => r.status === 'pending').length : '—'}</p>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{requests.data?.find((r) => r.status === 'pending')?.title ?? 'All caught up'}</p>
        </button>
      </section>

      {/* Today + health */}
      <section className="grid gap-5 xl:grid-cols-3">
        <div className="glass rounded-3xl p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">{tt ? `${today.day}'s classes` : "Today's classes"}</h2>
              <p className="text-sm text-[var(--text-muted)]">{tt ? `${today.list.length} sessions across the campus` : 'Generate a timetable to see the day here'}</p>
            </div>
            <button onClick={() => navigate('/app/timetable')} className="btn btn-ghost px-3 py-2 text-xs">
              Full timetable <ArrowRight size={14} />
            </button>
          </div>
          <div className="mt-5 max-h-[340px] space-y-2 overflow-y-auto pr-1">
            {!tt && (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
                <CalendarClock className="mx-auto text-[var(--text-muted)]" size={30} />
                <button onClick={() => navigate('/app/studio')} className="btn btn-primary mt-4">
                  <Sparkles size={16} /> Generate now
                </button>
              </div>
            )}
            {today.list.slice(0, 40).map((s, i) => (
              <div key={s.id} className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.05]" style={{ animation: `fade-up .5s ${Math.min(i, 12) * 40}ms both` }}>
                <div className="w-20 shrink-0 text-right">
                  <p className="text-sm font-semibold text-white">{fmtHour(s.start)}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{s.duration}h</p>
                </div>
                <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: SERIES[s.color % SERIES.length] }} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold text-white">
                    {s.isLab && <FlaskConical size={14} className="text-fuchsia-300" />} {s.subjectName}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {s.section} · {s.faculty} · {s.room}
                  </p>
                </div>
                <span className="chip hidden sm:inline-flex">{s.shift}</span>
              </div>
            ))}
          </div>
        </div>

        <HealthCard placed={placed} required={required} issues={tt?.unscheduled.length ?? 0} hasTimetable={Boolean(tt)} />
      </section>

      {/* Charts */}
      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <BarList title="Faculty by department" subtitle="Members per department" rows={facultyByDept} unit="faculty" />
        <RoomMix rows={roomMix} />
        <IsoLoad rows={loadByDay} />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function HealthCard({ placed, required, issues, hasTimetable }: { placed: number; required: number; issues: number; hasTimetable: boolean }) {
  const pct = required ? placed / required : 0;
  const r = 62;
  const c = 2 * Math.PI * r;
  const ok = hasTimetable && issues === 0;
  return (
    <div className="glass flex flex-col rounded-3xl p-6">
      <h2 className="font-display text-lg font-bold text-white">Scheduling health</h2>
      <p className="text-sm text-[var(--text-muted)]">Required weekly hours that have a slot</p>
      <div className="relative mx-auto my-6 h-44 w-44">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label={`${Math.round(pct * 100)} percent of hours placed`}>
          <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
          <circle cx="80" cy="80" r={r} fill="none" stroke={ok ? '#199e70' : '#c98500'} strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)', filter: `drop-shadow(0 0 12px ${ok ? '#199e70' : '#c98500'})` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-4xl font-bold text-white">{hasTimetable ? `${Math.round(pct * 100)}%` : '—'}</p>
          <p className="text-xs text-[var(--text-muted)]">{hasTimetable ? `${placed}/${required} h` : 'not generated'}</p>
        </div>
      </div>
      <div className={`mt-auto flex items-start gap-3 rounded-2xl border p-4 ${ok ? 'border-emerald-400/25 bg-emerald-400/[0.07]' : 'border-amber-400/25 bg-amber-400/[0.07]'}`}>
        {ok ? <CheckCircle2 size={20} className="shrink-0 text-emerald-400" /> : <TriangleAlert size={20} className="shrink-0 text-amber-300" />}
        <div>
          <p className="text-sm font-semibold text-white">{!hasTimetable ? 'No timetable yet' : ok ? 'No conflicts' : `${issues} item${issues === 1 ? '' : 's'} to review`}</p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{!hasTimetable ? 'Generate one from the Timetable page.' : ok ? 'Every section, teacher and room is clash-free.' : 'Open the timetable to see what could not be placed.'}</p>
        </div>
      </div>
    </div>
  );
}

function BarList({ title, subtitle, rows, unit }: { title: string; subtitle: string; rows: [string, number][]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>
      <div className="mt-5 space-y-3">
        {rows.length === 0 && <p className="py-8 text-center text-sm text-[var(--text-muted)]">No data yet</p>}
        {rows.map(([label, v], i) => (
          <div key={label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="group py-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-[var(--text-secondary)]">{label}</span>
              <span className={`tabular-nums transition ${hover === i ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                {v} {hover === i ? unit : ''}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-r-[4px] transition-all duration-1000" style={{ width: `${(v / max) * 100}%`, background: SERIES[0], opacity: hover === null || hover === i ? 1 : 0.45 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomMix({ rows }: { rows: { type: string; count: number; seats: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = Math.max(1, rows.reduce((a, r) => a + r.count, 0));
  const colors = [SERIES[0], SERIES[1], SERIES[2]];
  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-display text-lg font-bold text-white">Room mix</h2>
      <p className="text-sm text-[var(--text-muted)]">Share of rooms by type</p>
      <div className="mt-6 flex h-6 gap-[2px] overflow-hidden rounded-[6px]">
        {rows.map((r, i) =>
          r.count ? (
            <div
              key={r.type}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="h-full transition-all duration-700"
              style={{ width: `${(r.count / total) * 100}%`, background: colors[i], opacity: hover === null || hover === i ? 1 : 0.4 }}
              title={`${r.type}: ${r.count} rooms, ${r.seats} seats`}
            />
          ) : null
        )}
      </div>
      <div className="mt-6 space-y-3">
        {rows.map((r, i) => (
          <div key={r.type} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${hover === i ? 'bg-white/[0.05]' : ''}`}>
            <span className="h-3 w-3 rounded-[3px]" style={{ background: colors[i] }} />
            <span className="flex-1 text-sm text-[var(--text-secondary)]">{r.type}</span>
            <span className="text-sm font-semibold tabular-nums text-white">{r.count}</span>
            <span className="w-24 text-right text-xs tabular-nums text-[var(--text-muted)]">{r.seats.toLocaleString()} seats</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Isometric 3D column chart of weekly teaching hours per day (single series). */
function IsoLoad({ rows }: { rows: { day: string; hours: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.hours));
  return (
    <div className="glass overflow-hidden rounded-3xl p-6 lg:col-span-2 xl:col-span-1">
      <h2 className="font-display text-lg font-bold text-white">Teaching hours by day</h2>
      <p className="text-sm text-[var(--text-muted)]">{rows.length ? 'Hover a column for its value' : 'Appears after you generate a timetable'}</p>
      <div className="perspective mt-2 flex h-64 items-center justify-center" style={{ perspective: '900px' }}>
        {rows.length === 0 ? (
          <CalendarClock className="text-[var(--text-muted)]" size={34} />
        ) : (
          <div className="preserve-3d relative" style={{ transform: 'rotateX(58deg) rotateZ(-38deg)', width: rows.length * 46, height: 60 }}>
            <div className="absolute -inset-4 rounded-xl border border-white/10 bg-white/[0.03]" />
            {rows.map((r, i) => {
              const h = Math.max(6, (r.hours / max) * 130);
              const active = hover === i;
              const base = active ? '#5a9cf0' : SERIES[0];
              return (
                <div
                  key={r.day}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  className="preserve-3d absolute cursor-pointer"
                  style={{ left: i * 46, top: 10, width: 32, height: 32 }}
                >
                  {/* top */}
                  <div className="absolute inset-0 rounded-[3px] transition-all duration-700" style={{ background: base, transform: `translateZ(${h}px)`, boxShadow: active ? '0 0 30px #3987e5' : undefined }} />
                  {/* front */}
                  <div className="absolute bottom-0 left-0 w-8 origin-bottom transition-all duration-700" style={{ height: h, background: '#2a65ad', transform: 'rotateX(-90deg)' }} />
                  {/* side */}
                  <div className="absolute right-0 top-0 h-8 origin-right transition-all duration-700" style={{ width: h, background: '#1f4d85', transform: 'rotateY(90deg)' }} />
                  <span className="absolute -bottom-6 left-0 text-[10px] font-semibold text-[var(--text-muted)]" style={{ transform: 'translateZ(1px)' }}>
                    {r.day.slice(0, 3)}
                  </span>
                  {active && (
                    <span className="absolute left-0 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-bold text-[#0b0d1a]" style={{ transform: `translateZ(${h + 30}px) rotateZ(38deg) rotateX(-58deg)` }}>
                      {r.hours} h
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <div className="flex justify-between gap-1 text-[11px] text-[var(--text-muted)]">
          {rows.map((r, i) => (
            <span key={r.day} className={hover === i ? 'text-white' : ''}>
              {r.day.slice(0, 3)} {r.hours}h
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
