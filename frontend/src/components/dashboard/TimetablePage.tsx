import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CalendarDays,
  CheckCircle2,
  Clock,
  DoorOpen,
  FlaskConical,
  GraduationCap,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Sparkles,
  Square,
  Users,
  Zap,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import StatCard from './StatCard';
import TimetableGrid from '../timetable/TimetableGrid';
import AllSectionsMatrix from '../timetable/AllSectionsMatrix';
import SessionModal from '../timetable/SessionModal';
import DownloadMenu, { type DownloadAction } from '../timetable/DownloadMenu';
import { useTimetable } from '../../lib/useTimetable';
import type { Session } from '../../lib/scheduler';
import { downloadCsv, downloadExcel, downloadIcs, printTimetable } from '../../lib/exportTimetable';
import { swatchStyle } from '../../lib/timetableStyle';
import { navigate, useRoute } from '../../lib/router';
import { toast } from '../../lib/toast';

type ViewBy = 'all' | 'section' | 'faculty' | 'room';
const VIEW_KEY: Record<Exclude<ViewBy, 'all'>, 'section' | 'faculty' | 'room'> = { section: 'section', faculty: 'faculty', room: 'room' };

export default function TimetablePage({ readOnly = false }: { readOnly?: boolean }) {
  const { tt, busy, generate, data } = useTimetable({ autoGenerate: readOnly });
  const route = useRoute();
  const [viewBy, setViewBy] = useState<ViewBy>('all');
  const [target, setTarget] = useState('');
  const [iso, setIso] = useState(false);
  // phones show one day of the all-sections matrix at a time
  const [matrixDay, setMatrixDay] = useState<string>(() => (window.innerWidth < 640 ? 'first' : 'all'));
  const [selected, setSelected] = useState<Session | null>(null);
  const autoRan = useRef(false);

  async function run(days?: number) {
    const result = await generate(days);
    if (result) {
      const pct = result.stats.requiredHours ? Math.round((result.stats.scheduledHours / result.stats.requiredHours) * 100) : 0;
      toast(`Timetable generated in ${result.stats.ms.toFixed(1)} ms · ${pct}% of hours placed`);
    }
  }

  useEffect(() => {
    if (!readOnly && !autoRan.current && data.ready && route.includes('generate=1')) {
      autoRan.current = true;
      navigate('/app/timetable');
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.ready, route]);

  const options = useMemo(() => {
    if (!tt || viewBy === 'all') return [];
    const key = VIEW_KEY[viewBy];
    return [...new Set(tt.sessions.map((s) => s[key]))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [tt, viewBy]);

  const current = options.includes(target) ? target : (options[0] ?? '');
  const visible = useMemo(() => {
    if (!tt || viewBy === 'all') return [];
    return tt.sessions.filter((s) => s[VIEW_KEY[viewBy]] === current);
  }, [tt, viewBy, current]);

  const legend = useMemo(() => {
    const m = new Map<string, { name: string; color: number; hours: number; lab: boolean }>();
    visible.forEach((s) => {
      const cur = m.get(s.subjectCode);
      m.set(s.subjectCode, { name: s.subjectName, color: s.color, hours: (cur?.hours ?? 0) + s.duration, lab: s.isLab });
    });
    return [...m.entries()];
  }, [visible]);

  const pickSection = (name: string) => {
    setViewBy('section');
    setTarget(name);
  };

  const viewLabel = viewBy === 'all' ? 'All sections' : `${viewBy[0].toUpperCase()}${viewBy.slice(1)} ${current}`;
  const downloads: DownloadAction[] = tt
    ? [
        ...(viewBy !== 'all'
          ? [
              { id: 'pdf', icon: 'pdf' as const, label: `PDF of ${current}`, hint: 'Print-ready A4 landscape (Save as PDF)', run: () => printTimetable(`${viewLabel} timetable`) },
              { id: 'xl1', icon: 'excel' as const, label: `Excel for ${current}`, hint: 'Weekly grid plus a list of sessions', run: () => downloadExcel(tt, { groupBy: VIEW_KEY[viewBy], only: [current], fileName: `SchedulAI-${current}.xlsx` }) },
              { id: 'ics', icon: 'ics' as const, label: 'Calendar file (.ics)', hint: 'Google, Outlook or Apple Calendar · repeats weekly', run: () => downloadIcs(visible, `${viewLabel} timetable`) },
              { id: 'csv', icon: 'csv' as const, label: 'CSV', hint: `Sessions for ${current}`, run: () => downloadCsv(visible, `${viewLabel} timetable`) },
            ]
          : []),
        { id: 'xlall', icon: 'excel-all' as const, label: 'Excel: every section', hint: 'One sheet per section + all sessions', run: () => downloadExcel(tt, { groupBy: 'section' }) },
        { id: 'xlfac', icon: 'excel-all' as const, label: 'Excel: every faculty member', hint: 'One sheet per teacher', run: () => downloadExcel(tt, { groupBy: 'faculty', fileName: 'SchedulAI-faculty-timetables.xlsx' }) },
        { id: 'csvall', icon: 'csv' as const, label: 'CSV: whole campus', hint: `${tt.sessions.length} sessions`, run: () => downloadCsv(tt.sessions, 'campus timetable') },
      ]
    : [];

  const pct = tt && tt.stats.requiredHours ? Math.round((tt.stats.scheduledHours / tt.stats.requiredHours) * 100) : 0;
  const empty = data.ready && data.sections.length === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={readOnly ? 'Published timetable' : 'Academic planning'}
        title="Timetable"
        text={
          readOnly
            ? 'The campus-wide schedule published by your administrator. Look up any section, colleague or room, and download what you need.'
            : 'A conflict-free week for every section. Teachers, rooms and sections are never double-booked, labs get 2-hour blocks in lab rooms, and shifts are respected.'
        }
        actions={
          <>
            {tt && <DownloadMenu actions={downloads} />}
            {!readOnly && (
              <button onClick={() => run()} disabled={busy || !data.ready || empty} className="btn btn-primary">
                {busy ? <Loader2 size={17} className="animate-spin" /> : tt ? <RefreshCw size={17} /> : <Sparkles size={17} />}
                {busy ? 'Solving…' : tt ? 'Regenerate' : 'Generate timetable'}
              </button>
            )}
          </>
        }
      />

      {!tt ? (
        <section className="glass relative overflow-hidden rounded-[2rem] p-10 text-center sm:p-16">
          <div className="grid-fade absolute inset-0" />
          <div className="relative">
            <div className="perspective mx-auto h-28 w-28">
              <div className={`preserve-3d relative h-full w-full ${busy ? 'animate-spin-slow' : 'animate-float'}`} style={{ transform: 'rotateX(55deg) rotateZ(45deg)' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="absolute inset-0 rounded-2xl border border-white/20" style={{ transform: `translateZ(${i * 22}px)`, ...swatchStyle(i * 2) }} />
                ))}
              </div>
            </div>
            <h2 className="font-display mt-10 text-3xl font-bold text-white">{empty ? 'Add some data first' : busy ? 'Building the week…' : 'Ready when you are'}</h2>
            <p className="mx-auto mt-2 max-w-md text-[var(--text-secondary)]">
              {empty
                ? 'There are no sections yet. Import a file or load the demo campus to get started.'
                : `${data.sections.length} sections, ${data.subjects.length} subjects, ${data.faculty.length} faculty and ${data.rooms.length} rooms are ready to be scheduled.`}
            </p>
            {!readOnly &&
              (empty ? (
                <button onClick={() => navigate('/app/import')} className="btn btn-primary mt-7 px-6 py-3">
                  Go to Data Import
                </button>
              ) : (
                <button onClick={() => run()} disabled={busy || !data.ready} className="btn btn-primary mt-7 px-7 py-3.5 text-base">
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} {busy ? 'Solving constraints…' : 'Generate timetable'}
                </button>
              ))}
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Hours placed" value={pct} suffix="%" note={`${tt.stats.scheduledHours} of ${tt.stats.requiredHours} weekly hours`} icon={CheckCircle2} tone={pct === 100 ? 'emerald' : 'amber'} />
            <StatCard label="Sessions" value={tt.sessions.length} note={`Across ${tt.stats.sections} sections`} icon={CalendarDays} tone="violet" />
            <StatCard label="Faculty teaching" value={tt.stats.facultyUsed} note={`${tt.stats.roomsUsed} rooms in use`} icon={Users} tone="sky" />
            <StatCard label="Solved in" value={Number(tt.stats.ms.toFixed(1))} suffix=" ms" note={new Date(tt.generatedAt).toLocaleString()} icon={Zap} tone="fuchsia" />
          </section>

          <section className="glass print-area overflow-hidden rounded-3xl">
            <div className="no-print flex flex-col gap-4 border-b border-white/5 p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex overflow-x-auto rounded-xl border border-white/10 p-0.5">
                  {(
                    [
                      ['all', LayoutGrid, 'All sections'],
                      ['section', GraduationCap, 'Section'],
                      ['faculty', Users, 'Faculty'],
                      ['room', DoorOpen, 'Room'],
                    ] as const
                  ).map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setViewBy(id)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${viewBy === id ? 'bg-white text-[#0b0d1a]' : 'text-[var(--text-secondary)] hover:text-white'}`}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
                {viewBy !== 'all' && (
                  <select value={current} onChange={(e) => setTarget(e.target.value)} className="form-input py-2 sm:w-auto sm:min-w-[220px]" aria-label="Choose what to show">
                    {options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!readOnly && (
                  <div className="flex rounded-xl border border-white/10 p-0.5 text-xs font-semibold">
                    {[5, 6].map((n) => (
                      <button key={n} onClick={() => run(n)} className={`rounded-lg px-3 py-1.5 transition ${tt.days.length === n ? 'bg-white/10 text-white' : 'text-[var(--text-muted)] hover:text-white'}`}>
                        {n}-day week
                      </button>
                    ))}
                  </div>
                )}
                {viewBy !== 'all' && (
                  <button onClick={() => setIso((v) => !v)} className={`btn px-3 py-2 text-xs ${iso ? 'btn-primary' : 'btn-ghost'}`}>
                    {iso ? <Square size={14} /> : <Box size={14} />} {iso ? 'Flat view' : '3D view'}
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {viewBy === 'all' ? (
                <>
                  <p className="no-print mb-4 text-xs text-[var(--text-muted)]">
                    Every section at once. Each square is one hour; the letters abbreviate the subject and <b className="text-white">L</b> marks a lab. Click a row to open that section.
                  </p>
                  <div className="no-print mb-4 flex gap-1.5 overflow-x-auto pb-1">
                    {['all', ...tt.days].map((d) => {
                      const active = matrixDay === d || (matrixDay === 'first' && d === tt.days[0]);
                      return (
                        <button key={d} onClick={() => setMatrixDay(d)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-white text-[#0b0d1a]' : 'bg-white/5 text-[var(--text-secondary)] hover:text-white'}`}>
                          {d === 'all' ? 'Whole week' : d}
                        </button>
                      );
                    })}
                  </div>
                  <AllSectionsMatrix sessions={tt.sessions} days={matrixDay === 'all' ? tt.days : [matrixDay === 'first' ? tt.days[0] : matrixDay]} onPick={pickSection} />
                </>
              ) : (
                <TimetableGrid sessions={visible} days={tt.days} perspective={VIEW_KEY[viewBy]} iso={iso} onSelect={setSelected} title={`${viewLabel} — weekly timetable`} />
              )}
            </div>

            {viewBy !== 'all' && (
              <div className="flex flex-col gap-3 border-t border-white/5 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
                  {legend.map(([code, l]) => (
                    <span key={code} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-[3px]" style={swatchStyle(l.color)} />
                      {l.name}
                      {l.lab && <FlaskConical size={11} className="text-[var(--text-muted)]" />}
                      <span className="text-[var(--text-muted)]">{l.hours}h</span>
                    </span>
                  ))}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Clock size={12} /> {visible.reduce((a, s) => a + s.duration, 0)} hours / week · click a class for details
                </p>
              </div>
            )}
          </section>

          <section className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              {tt.unscheduled.length === 0 ? <CheckCircle2 className="text-emerald-400" size={22} /> : <AlertTriangle className="text-amber-300" size={22} />}
              <div>
                <h3 className="font-display text-lg font-bold text-white">{tt.unscheduled.length === 0 ? 'Everything fits' : `${tt.unscheduled.length} item${tt.unscheduled.length === 1 ? '' : 's'} need attention`}</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  {tt.unscheduled.length === 0 ? 'Every required hour has a slot, a teacher and a room.' : 'Add rooms, faculty or a 6th day, then regenerate.'}
                </p>
              </div>
            </div>
            {tt.unscheduled.length > 0 && (
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {tt.unscheduled.slice(0, 24).map((u, i) => (
                  <li key={i} className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm">
                    <p className="font-semibold text-white">
                      {u.section} · {u.subject} {u.hours > 0 && <span className="text-amber-200">({u.hours}h)</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-100/70">{u.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <SessionModal session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
