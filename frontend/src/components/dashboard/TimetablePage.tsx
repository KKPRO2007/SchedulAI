import { useMemo, useState } from 'react';
import { BadgeCheck, Box, Square, CalendarDays, CheckCircle2, Clock, DoorOpen, FlaskConical, GraduationCap, History, LayoutGrid, Loader2, Sparkles, Users, Gauge } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import StatCard from './StatCard';
import TimetableGrid from '../timetable/TimetableGrid';
import AllSectionsMatrix from '../timetable/AllSectionsMatrix';
import SessionModal from '../timetable/SessionModal';
import DownloadMenu, { type DownloadAction } from '../timetable/DownloadMenu';
import type { Session } from '../../lib/scheduler';
import { downloadCsv, downloadExcel, downloadIcs, printTimetable } from '../../lib/exportTimetable';
import { downloadPdf } from '../../lib/exportPdf';
import { swatchStyle } from '../../lib/timetableStyle';
import { navigate } from '../../lib/router';
import { logEvent, usePublished } from '../../lib/workflow';
import { useRole } from '../../lib/auth';

type ViewBy = 'all' | 'section' | 'faculty' | 'room';
const VIEW_KEY: Record<Exclude<ViewBy, 'all'>, 'section' | 'faculty' | 'room'> = { section: 'section', faculty: 'faculty', room: 'room' };

/** The published timetable, shown to every role. Only an approved, published version appears here. */
export default function TimetablePage() {
  const role = useRole();
  const staff = role === 'admin' || role === 'coordinator';
  const published = usePublished();
  const v = published.data;
  const tt = v?.payload;
  const [viewBy, setViewBy] = useState<ViewBy>('all');
  const [target, setTarget] = useState('');
  const [selected, setSelected] = useState<Session | null>(null);
  const [iso, setIso] = useState(false);
  const [matrixDay, setMatrixDay] = useState<string>(() => (window.innerWidth < 640 ? 'first' : 'all'));

  const options = useMemo(() => {
    if (!tt || viewBy === 'all') return [];
    const key = VIEW_KEY[viewBy];
    return [...new Set(tt.sessions.map((s) => s[key]))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [tt, viewBy]);

  const current = options.includes(target) ? target : (options[0] ?? '');
  const visible = useMemo(() => (!tt || viewBy === 'all' ? [] : tt.sessions.filter((s) => s[VIEW_KEY[viewBy]] === current)), [tt, viewBy, current]);

  const legend = useMemo(() => {
    const m = new Map<string, { name: string; color: number; hours: number; lab: boolean }>();
    visible.forEach((s) => {
      const cur = m.get(s.subjectCode);
      m.set(s.subjectCode, { name: s.subjectName, color: s.color, hours: (cur?.hours ?? 0) + s.duration, lab: s.isLab });
    });
    return [...m.entries()];
  }, [visible]);

  const viewLabel = viewBy === 'all' ? 'All sections' : `${viewBy[0].toUpperCase()}${viewBy.slice(1)} ${current}`;
  const track = (what: string, fn: () => void) => () => {
    fn();
    logEvent('exported timetable', `${what} · ${v?.label ?? ''}`);
  };
  const downloads: DownloadAction[] = tt
    ? [
        ...(viewBy !== 'all'
          ? [
              { id: 'pdf', icon: 'pdf' as const, label: `PDF of ${current}`, hint: 'School-format A4 timetable with subject key', run: track(`PDF ${current}`, () => downloadPdf(tt, { groupBy: VIEW_KEY[viewBy], only: [current], versionLabel: v?.label, fileName: `${current} timetable.pdf` })) },
              { id: 'print', icon: 'print' as const, label: 'Print this view', hint: 'Opens the browser print dialog', run: track(`Print ${current}`, () => printTimetable(`${viewLabel} timetable · ${v?.label}`)) },
              { id: 'xl1', icon: 'excel' as const, label: `Excel for ${current}`, hint: 'Weekly grid plus a list of sessions', run: track(`Excel ${current}`, () => downloadExcel(tt, { groupBy: VIEW_KEY[viewBy], only: [current], fileName: `SchedulAI-${current}.xlsx` })) },
              { id: 'ics', icon: 'ics' as const, label: 'Calendar file (.ics)', hint: 'Google, Outlook or Apple Calendar · repeats weekly', run: track(`ICS ${current}`, () => downloadIcs(visible, `${viewLabel} timetable`)) },
              { id: 'csv', icon: 'csv' as const, label: 'CSV', hint: `Sessions for ${current}`, run: track(`CSV ${current}`, () => downloadCsv(visible, `${viewLabel} timetable`)) },
            ]
          : []),
        { id: 'pdfall', icon: 'pdf' as const, label: 'PDF: every section', hint: 'One school-format page per section', run: track('PDF all sections', () => downloadPdf(tt, { groupBy: 'section', versionLabel: v?.label, fileName: 'all-sections-timetable.pdf' })) },
        { id: 'xlall', icon: 'excel-all' as const, label: 'Excel: every section', hint: 'One sheet per section + all sessions', run: track('Excel all sections', () => downloadExcel(tt, { groupBy: 'section' })) },
        ...(staff
          ? [
              { id: 'pdffac', icon: 'pdf' as const, label: 'PDF: every faculty member', hint: 'One page per teacher', run: track('PDF all faculty', () => downloadPdf(tt, { groupBy: 'faculty', versionLabel: v?.label, fileName: 'all-faculty-timetables.pdf' })) },
              { id: 'xlfac', icon: 'excel-all' as const, label: 'Excel: every faculty member', hint: 'One sheet per teacher', run: track('Excel all faculty', () => downloadExcel(tt, { groupBy: 'faculty', fileName: 'SchedulAI-faculty-timetables.xlsx' })) },
              { id: 'csvall', icon: 'csv' as const, label: 'CSV: whole campus', hint: `${tt.sessions.length} sessions`, run: track('CSV campus', () => downloadCsv(tt.sessions, 'campus timetable')) },
            ]
          : []),
      ]
    : [];

  if (published.loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand-300" size={30} />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Published timetable"
        title="Timetable"
        text="The approved, published version that faculty and students see. Drafts and candidates never appear here."
        actions={
          <>
            {tt && <DownloadMenu actions={downloads} />}
            {staff && (
              <button onClick={() => navigate('/app/studio')} className="btn btn-primary">
                <Sparkles size={17} /> Generate new version
              </button>
            )}
          </>
        }
      />

      {!v || !tt ? (
        <section className="glass rounded-2xl p-10 text-center sm:p-16">
          <CalendarDays className="mx-auto text-brand-300" size={36} />
          <h2 className="mt-5 text-2xl font-semibold text-[var(--text-primary)] tabular-nums">Nothing published yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">
            {staff ? 'Generate candidates, save one as a draft and send it through approval.' : 'The timetable office hasn’t published a timetable yet. Check back soon.'}
          </p>
          {staff && (
            <button onClick={() => navigate('/app/studio')} className="btn btn-primary mt-6">
              <Sparkles size={16} /> Open the generator
            </button>
          )}
        </section>
      ) : (
        <>
          <section className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-400/10 text-emerald-300">
                <BadgeCheck size={20} />
              </span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{v.label}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Published {v.publishedAt ? new Date(v.publishedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''} · approved by {v.reviewedBy ?? '—'}
                </p>
              </div>
            </div>
            {staff && (
              <button onClick={() => navigate('/app/versions')} className="btn btn-ghost px-3 py-2 text-xs">
                <History size={14} /> Version history
              </button>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Sessions" value={tt.sessions.length} note={`Across ${tt.stats.sections} sections`} icon={CalendarDays} tone="violet" />
            <StatCard label="Hours placed" value={tt.stats.requiredHours ? Math.round((tt.stats.scheduledHours / tt.stats.requiredHours) * 100) : 0} suffix="%" note={`${tt.stats.scheduledHours} of ${tt.stats.requiredHours} weekly hours`} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Faculty teaching" value={tt.stats.facultyUsed} note={`${tt.stats.roomsUsed} rooms in use`} icon={Users} tone="sky" />
            <StatCard label="Soft score" value={v.score ? Math.round(v.score.total * 100) : 0} note={v.score ? `${v.score.hardPassed}/${v.score.hardTotal} hard constraints met` : 'Not scored'} icon={Gauge} tone="fuchsia" />
          </section>

          <section className="glass print-area overflow-hidden rounded-2xl">
            <div className="no-print flex flex-col gap-4 border-b border-white/10 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex overflow-x-auto rounded-md border border-white/10 p-0.5">
                  {(
                    [
                      ['all', LayoutGrid, 'All sections'],
                      ['section', GraduationCap, 'Section'],
                      ['faculty', Users, 'Faculty'],
                      ['room', DoorOpen, 'Room'],
                    ] as const
                  ).map(([id, Icon, label]) => (
                    <button key={id} onClick={() => setViewBy(id)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 py-1.5 text-xs font-semibold transition ${viewBy === id ? 'pill-active' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
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
              {viewBy !== 'all' && (
                <button onClick={() => setIso((x) => !x)} className={`btn hidden px-3 py-2 text-xs sm:inline-flex ${iso ? 'btn-primary' : 'btn-ghost'}`}>
                  {iso ? <Square size={14} /> : <Box size={14} />} {iso ? 'Flat view' : '3D view'}
                </button>
              )}
            </div>

            <div className="p-4 sm:p-6">
              {viewBy === 'all' ? (
                <>
                  <p className="no-print mb-4 text-xs text-[var(--text-muted)]">
                    Every section at once. Each square is one hour; letters abbreviate the subject and <b className="text-[var(--text-primary)]">L</b> marks a lab. Tap a row to open that section.
                  </p>
                  <div className="no-print mb-4 flex gap-1.5 overflow-x-auto pb-1">
                    {['all', ...tt.days].map((d) => {
                      const active = matrixDay === d || (matrixDay === 'first' && d === tt.days[0]);
                      return (
                        <button key={d} onClick={() => setMatrixDay(d)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'pill-active' : 'bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                          {d === 'all' ? 'Whole week' : d}
                        </button>
                      );
                    })}
                  </div>
                  <AllSectionsMatrix
                    sessions={tt.sessions}
                    days={matrixDay === 'all' ? tt.days : [matrixDay === 'first' ? tt.days[0] : matrixDay]}
                    onPick={(name) => {
                      setViewBy('section');
                      setTarget(name);
                    }}
                  />
                </>
              ) : (
                <TimetableGrid sessions={visible} days={tt.days} perspective={VIEW_KEY[viewBy]} iso={iso} onSelect={setSelected} title={`${viewLabel} — ${v.label}`} />
              )}
            </div>

            {viewBy !== 'all' && (
              <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
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
                  <Clock size={12} /> {visible.reduce((a, s) => a + s.duration, 0)} hours / week · tap a class for details
                </p>
              </div>
            )}
          </section>
        </>
      )}

      <SessionModal session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
