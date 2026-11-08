import { CalendarPlus, Clock, DoorOpen, FlaskConical, GraduationCap, Hash, Mail, UserRound } from 'lucide-react';
import Modal from '../ui/Modal';
import { fmtHour, type Session } from '../../lib/scheduler';
import { dateOf, downloadIcs } from '../../lib/exportTimetable';
import { subjectColor } from '../../lib/timetableStyle';

export default function SessionModal({ session, onClose }: { session: Session | null; onClose: () => void }) {
  if (!session) return null;
  const s = session;
  const rows = [
    { icon: Clock, label: 'When', value: `${s.day} ${dateOf(s.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${fmtHour(s.start)} – ${fmtHour(s.start + s.duration)}` },
    { icon: GraduationCap, label: 'Section', value: `${s.section} · ${s.shift}` },
    { icon: UserRound, label: 'Faculty', value: s.faculty },
    { icon: Mail, label: 'Email', value: s.facultyEmail },
    { icon: DoorOpen, label: 'Room', value: s.room },
    { icon: Hash, label: 'Subject code', value: `${s.subjectCode} · ${s.department}` },
  ];
  return (
    <Modal
      open
      onClose={onClose}
      icon={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white" style={{ background: subjectColor(s.color) }}>
          {s.isLab ? <FlaskConical size={20} /> : <Clock size={20} />}
        </span>
      }
      title={s.subjectName}
      subtitle={s.isLab ? 'Laboratory session · 2-hour block' : 'Lecture · 1 hour'}
    >
      <div className="space-y-2 p-6">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 rounded-md bg-white/[0.03] px-4 py-3">
            <r.icon size={16} className="shrink-0 text-[var(--text-muted)]" />
            <span className="w-28 text-xs text-[var(--text-muted)]">{r.label}</span>
            <span className="min-w-0 truncate text-sm text-[var(--text-primary)]">{r.value}</span>
          </div>
        ))}
        <button onClick={() => downloadIcs([s], `${s.subjectName} ${s.section}`)} className="btn btn-ghost mt-3 w-full">
          <CalendarPlus size={16} /> Add this class to my calendar
        </button>
      </div>
    </Modal>
  );
}
