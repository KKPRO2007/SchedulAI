import { useMemo, useState } from 'react';
import { BookOpen, CalendarCheck2, Clock, DoorOpen, FlaskConical, GitPullRequestArrow, GraduationCap, Hourglass, Loader2, MapPin, Sun, Sunset, UserRound } from 'lucide-react';
import StatCard from './StatCard';
import TimetableGrid from '../timetable/TimetableGrid';
import SessionModal from '../timetable/SessionModal';
import DownloadMenu from '../timetable/DownloadMenu';
import { useSession } from '../../lib/auth';
import { usePublished, useRequests } from '../../lib/workflow';
import { useAllData, notifyDataChanged } from '../../lib/useData';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { navigate } from '../../lib/router';
import type { PreferredWindow } from '../../lib/types';
import { fmtHour, type Session } from '../../lib/scheduler';
import { dateOf, downloadCsv, downloadExcel, downloadIcs } from '../../lib/exportTimetable';
import { downloadPdf } from '../../lib/exportPdf';
import { subjectColor, swatchStyle } from '../../lib/timetableStyle';

const MAX_LOAD = 18;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Next class from now, wrapping to next week. */
function nextClass(list: Session[], days: string[]) {
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long' });
  const nowIdx = days.indexOf(today);
  const hour = now.getHours() + now.getMinutes() / 60;
  const score = (s: Session) => {
    let d = days.indexOf(s.day) - (nowIdx < 0 ? -1 : nowIdx);
    if (d < 0 || (d === 0 && s.start <= hour)) d += 7;
    return d * 24 + s.start;
  };
  return [...list].sort((a, b) => score(a) - score(b))[0] ?? null;
}

export default function MySchedule() {
  const session = useSession();
  const published = usePublished();
  const tt = published.data?.payload ?? null;
  const data = useAllData();
  const requests = useRequests();
  const pending = (requests.data ?? []).filter((r) => r.status === 'pending').length;
  const [selected, setSelected] = useState<Session | null>(null);
  const [previewAs, setPreviewAs] = useState('');

  const myEmail = session?.user.email.toLowerCase() ?? '';
  const teachers = useMemo(() => (tt ? [...new Map(tt.sessions.map((s) => [s.facultyEmail.toLowerCase(), s.faculty])).entries()].sort((a, b) => a[1].localeCompare(b[1])) : []), [tt]);
  const isMe = teachers.some(([e]) => e === myEmail);
  const email = previewAs || (isMe ? myEmail : (teachers[0]?.[0] ?? ''));


  const mine = useMemo(() => (tt ? tt.sessions.filter((s) => s.facultyEmail.toLowerCase() === email) : []), [tt, email]);
  const me = data.faculty.find((f) => f.email.toLowerCase() === email);
  const name = me?.name ?? mine[0]?.faculty ?? session?.user.name ?? 'Faculty';
  const hours = mine.reduce((a, s) => a + s.duration, 0);
  const sectionsTaught = [...new Set(mine.map((s) => s.section))];
  const subjectsTaught = [...new Map(mine.map((s) => [s.subjectCode, s])).values()];
  const next = tt ? nextClass(mine, tt.days) : null;

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const focusDay = tt?.days.includes(todayName) ? todayName : (tt?.days[0] ?? 'Monday');
  const dayList = mine.filter((s) => s.day === focusDay).sort((a, b) => a.start - b.start);

  async function setWindow(w: PreferredWindow) {
    try {
      await api.patch('/faculty/me/preferences', { preferredWindow: w });
      notifyDataChanged();
      toast(w === 'any' ? 'Preference cleared' : `Preferred window set to ${w}. It counts in the next generated timetable.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
    }
  }

  if (!tt) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="animate-spin text-brand-300" size={30} />
        <p className="text-[var(--text-secondary)]">{published.loading ? 'Loading your week…' : 'No timetable has been published yet.'}</p>
      </div>
    );
  }

  const firstName = name.replace(/^(dr|prof)\.?\s+/i, '').split(' ')[0];

  return (
    <div className="space-y-7">
      <section className="relative animate-fade-up py-1 sm:py-3">
        <div className="grid-fade absolute inset-0 -z-10 opacity-60" />
        <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="font-serif mt-2 text-[2rem] font-semibold leading-tight text-white sm:text-[2.75rem]">
              {greeting()}, <span className="text-gradient">{firstName}</span>
            </h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              {me?.designation ?? 'Faculty'} · {me?.department ?? mine[0]?.department} · {hours} teaching hours this week
            </p>
            {!isMe && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                Your account isn't in the current timetable, so you're previewing a colleague's week.
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <DownloadMenu
                label="Download my timetable"
                actions={[
                  { id: 'pdf', icon: 'pdf', label: 'PDF (school format)', hint: 'A4 timetable with subject key, ready to print', run: () => downloadPdf(tt, { groupBy: 'faculty', only: [mine[0]?.faculty ?? name], versionLabel: published.data?.label, fileName: `${name} timetable.pdf` }) },
                  { id: 'ics', icon: 'ics', label: 'Add to calendar (.ics)', hint: 'Google, Outlook or Apple · repeats weekly', run: () => downloadIcs(mine, `${name} timetable`) },
                  { id: 'xl', icon: 'excel', label: 'Excel', hint: 'Weekly grid plus a session list', run: () => downloadExcel(tt, { groupBy: 'faculty', only: [mine[0]?.faculty ?? name], fileName: `${name} timetable.xlsx` }) },
                  { id: 'csv', icon: 'csv', label: 'CSV', hint: `${mine.length} sessions`, run: () => downloadCsv(mine, `${name} timetable`) },
                ]}
              />
              <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <UserRound size={14} /> View as
                <select value={email} onChange={(e) => setPreviewAs(e.target.value)} className="form-input w-auto py-1.5 text-xs">
                  {teachers.map(([e, n]) => (
                    <option key={e} value={e}>
                      {n}
                      {e === myEmail ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {next && (
            <div className="glass relative w-full overflow-hidden rounded-2xl p-5 sm:p-6 xl:w-[420px]">
              <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: subjectColor(next.color) }} />
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-300">
                <Hourglass size={13} /> Up next
              </p>
              <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)] tabular-nums">{next.subjectName}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Clock size={15} /> {next.day.slice(0, 3)} {dateOf(next.day).getDate()} · {fmtHour(next.start)}
                </span>
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <MapPin size={15} /> {next.room}
                </span>
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <GraduationCap size={15} /> {next.section}
                </span>
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  {next.isLab ? <FlaskConical size={15} /> : <BookOpen size={15} />} {next.isLab ? '2h lab' : '1h lecture'}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Teaching hours" value={hours} suffix="h" note={`${Math.round((hours / MAX_LOAD) * 100)}% of the ${MAX_LOAD}h weekly limit`} icon={Clock} tone="violet" />
        <StatCard label="Classes a week" value={mine.length} note={`${mine.filter((s) => s.isLab).length} of them labs`} icon={CalendarCheck2} tone="sky" />
        <StatCard label="Sections" value={sectionsTaught.length} note={sectionsTaught.join(', ') || '—'} icon={GraduationCap} tone="emerald" />
        <StatCard label="Rooms" value={new Set(mine.map((s) => s.room)).size} note={[...new Set(mine.map((s) => s.room))].slice(0, 4).join(', ') || '—'} icon={DoorOpen} tone="fuchsia" />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{focusDay === todayName ? 'Today' : focusDay}</h2>
          <p className="text-sm text-[var(--text-muted)]">{dayList.length ? `${dayList.length} class${dayList.length === 1 ? '' : 'es'}` : 'No classes — enjoy the free day'}</p>
          <ol className="relative mt-5 space-y-4 border-l border-white/10 pl-5">
            {dayList.map((s) => (
              <li key={s.id} className="relative">
                <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-[#10142a]" style={{ background: subjectColor(s.color) }} />
                <button onClick={() => setSelected(s)} className="w-full rounded-xl bg-white/[0.035] p-3 text-left transition hover:border-white/20">
                  <p className="text-xs font-semibold text-[var(--text-muted)]">
                    {fmtHour(s.start)} – {fmtHour(s.start + s.duration)}
                  </p>
                  <p className="mt-0.5 font-semibold text-[var(--text-primary)]">{s.subjectName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {s.section} · {s.room}
                  </p>
                </button>
              </li>
            ))}
          </ol>

          {isMe && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Preferred teaching window</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">A soft preference: the generator tries to honour it, and the score shows how often it did.</p>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {([['any', Clock, 'Any time'], ['morning', Sun, 'Mornings'], ['afternoon', Sunset, 'Afternoons']] as const).map(([w, Icon, l]) => (
                  <button
                    key={w}
                    onClick={() => setWindow(w)}
                    className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs font-semibold transition ${(me?.preferredWindow ?? 'any') === w ? 'border-brand-400/50 bg-brand-400/10 text-[var(--text-primary)]' : 'border-white/10 bg-white/[0.03] text-[var(--text-secondary)]'}`}
                  >
                    <Icon size={15} /> {l}
                  </button>
                ))}
              </div>
              <button onClick={() => navigate('/app/requests')} className="btn btn-ghost mt-3 w-full text-xs">
                <GitPullRequestArrow size={14} /> {pending ? `${pending} pending · ` : ''}Raise a change request
              </button>
            </div>
          )}

          <h3 className="mt-8 text-sm font-semibold text-[var(--text-primary)]">Weekly load</h3>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-brand-600 transition-all duration-1000" style={{ width: `${Math.min(100, (hours / MAX_LOAD) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {hours} of {MAX_LOAD} hours
          </p>

          <h3 className="mt-8 text-sm font-semibold text-[var(--text-primary)]">Subjects</h3>
          <ul className="mt-3 space-y-2">
            {subjectsTaught.map((s) => (
              <li key={s.subjectCode} className="flex items-center gap-3 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-[3px]" style={swatchStyle(s.color)} />
                <span className="flex-1 truncate text-[var(--text-secondary)]">{s.subjectName}</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">{s.subjectCode}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass print-area overflow-hidden rounded-2xl xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">My week</h2>
              <p className="text-sm text-[var(--text-muted)]">Click a class for room, section and calendar details</p>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <TimetableGrid sessions={mine} days={tt.days} perspective="faculty" onSelect={setSelected} title={`${name} — weekly timetable`} />
          </div>
        </div>
      </section>

      <SessionModal session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
