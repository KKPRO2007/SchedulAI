import { useMemo, useState } from 'react';
import { BadgeCheck, BookOpen, CalendarCheck2, Clock, FlaskConical, GraduationCap, Hourglass, Loader2, MapPin, UserRound } from 'lucide-react';
import StatCard from './StatCard';
import TimetableGrid from '../timetable/TimetableGrid';
import SessionModal from '../timetable/SessionModal';
import DownloadMenu from '../timetable/DownloadMenu';
import { useSession } from '../../lib/auth';
import { usePublished } from '../../lib/workflow';
import { fmtHour, type Session } from '../../lib/scheduler';
import { dateOf, downloadCsv, downloadExcel, downloadIcs, printTimetable } from '../../lib/exportTimetable';
import { subjectColor, swatchStyle } from '../../lib/timetableStyle';

function nextClass(list: Session[], days: string[]) {
  const now = new Date();
  const nowIdx = days.indexOf(now.toLocaleDateString('en-US', { weekday: 'long' }));
  const hour = now.getHours() + now.getMinutes() / 60;
  const score = (s: Session) => {
    let d = days.indexOf(s.day) - (nowIdx < 0 ? -1 : nowIdx);
    if (d < 0 || (d === 0 && s.start <= hour)) d += 7;
    return d * 24 + s.start;
  };
  return [...list].sort((a, b) => score(a) - score(b))[0] ?? null;
}

/** Read-only view of the published timetable for the student's own section (synopsis §10.2). */
export default function StudentTimetable() {
  const session = useSession();
  const published = usePublished();
  const tt = published.data?.payload;
  const sections = useMemo(() => (tt ? [...new Set(tt.sessions.map((s) => s.section))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : []), [tt]);
  const mine = session?.user.section ?? '';
  const [picked, setPicked] = useState('');
  const section = picked || (sections.includes(mine) ? mine : (sections[0] ?? ''));
  const [selected, setSelected] = useState<Session | null>(null);

  const list = useMemo(() => (tt ? tt.sessions.filter((s) => s.section === section) : []), [tt, section]);
  const subjects = [...new Map(list.map((s) => [s.subjectCode, s])).values()];
  const teachers = [...new Set(list.map((s) => s.faculty))];
  const next = tt ? nextClass(list, tt.days) : null;

  if (published.loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-violet-300" size={30} />
      </div>
    );
  }
  if (!tt) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <CalendarCheck2 className="mx-auto text-violet-300" size={32} />
        <p className="font-display mt-4 text-xl font-bold text-white">No timetable published yet</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Your timetable will appear here as soon as it is approved.</p>
      </div>
    );
  }

  const name = (session?.user.name ?? 'Student').split(' ')[0];

  return (
    <div className="space-y-7">
      <section className="glass relative animate-fade-up overflow-hidden rounded-3xl p-5 sm:rounded-[2rem] sm:p-9">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(124,92,255,0.22),transparent_55%)]" />
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="font-display mt-3 text-3xl font-bold text-white sm:text-5xl">Hi {name} 👋</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              <BadgeCheck size={15} className="text-emerald-300" /> {published.data?.label}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <GraduationCap size={14} /> Section
                <select value={section} onChange={(e) => setPicked(e.target.value)} className="form-input w-auto py-1.5 text-xs">
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                      {s === mine ? ' (yours)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <DownloadMenu
                label="Download"
                actions={[
                  { id: 'pdf', icon: 'pdf', label: 'PDF', hint: 'Print-ready weekly grid', run: () => printTimetable(`${section} — ${published.data?.label}`) },
                  { id: 'ics', icon: 'ics', label: 'Add to calendar (.ics)', hint: 'Repeats weekly', run: () => downloadIcs(list, `${section} timetable`) },
                  { id: 'xl', icon: 'excel', label: 'Excel', hint: 'Weekly grid + session list', run: () => downloadExcel(tt, { groupBy: 'section', only: [section], fileName: `${section} timetable.xlsx` }) },
                  { id: 'csv', icon: 'csv', label: 'CSV', hint: `${list.length} sessions`, run: () => downloadCsv(list, `${section} timetable`) },
                ]}
              />
            </div>
          </div>
          {next && (
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/25 p-5 sm:p-6 xl:w-[400px]">
              <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: subjectColor(next.color) }} />
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">
                <Hourglass size={13} /> Next class
              </p>
              <p className="font-display mt-3 text-2xl font-bold text-white">{next.subjectName}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
                <span className="flex items-center gap-2">
                  <Clock size={15} /> {next.day.slice(0, 3)} {dateOf(next.day).getDate()} · {fmtHour(next.start)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin size={15} /> {next.room}
                </span>
                <span className="col-span-2 flex items-center gap-2">
                  <UserRound size={15} /> {next.faculty}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Classes a week" value={list.length} note={`${list.filter((s) => s.isLab).length} labs`} icon={CalendarCheck2} tone="violet" />
        <StatCard label="Hours a week" value={list.reduce((a, s) => a + s.duration, 0)} suffix="h" note={list[0]?.shift ?? ''} icon={Clock} tone="sky" />
        <StatCard label="Subjects" value={subjects.length} note="This semester" icon={BookOpen} tone="emerald" />
        <StatCard label="Teachers" value={teachers.length} note={teachers.slice(0, 2).join(', ')} icon={UserRound} tone="fuchsia" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="glass print-area min-w-0 overflow-hidden rounded-3xl">
          <div className="border-b border-white/5 px-5 py-4">
            <h2 className="font-display text-lg font-bold text-white">{section} · weekly timetable</h2>
            <p className="text-sm text-[var(--text-muted)]">Tap a class for room and teacher details</p>
          </div>
          <div className="p-4 sm:p-5">
            <TimetableGrid sessions={list} days={tt.days} perspective="section" onSelect={setSelected} title={`${section} — ${published.data?.label}`} />
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <h3 className="font-display font-bold text-white">Subjects & teachers</h3>
          <ul className="mt-4 space-y-3">
            {subjects.map((s) => (
              <li key={s.subjectCode} className="flex items-start gap-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-[3px]" style={swatchStyle(s.color)} />
                <span className="min-w-0 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-white">
                    {s.subjectName} {s.isLab && <FlaskConical size={12} className="text-[var(--text-muted)]" />}
                  </span>
                  <span className="block text-xs text-[var(--text-muted)]">
                    {s.subjectCode} · {s.faculty}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SessionModal session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
