import { Database, HardDrive, KeyRound, RotateCcw, Trash2 } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import { useDataMode, notifyDataChanged } from '../../lib/useData';
import { resetLocalDb } from '../../lib/localDb';
import { DEMO_ACCOUNTS } from '../../lib/auth';
import { toast } from '../../lib/toast';
import { clearAssignments } from '../../lib/scheduler';
import { notifyWorkflow } from '../../lib/workflow';

export default function SettingsPage() {
  const mode = useDataMode();
  const local = mode === 'local';
  const forced = localStorage.getItem('schedulai.mode') === 'local';

  function clearTimetable() {
    clearAssignments();
    notifyWorkflow();
    toast('Timetable and saved allocations cleared', 'info');
  }

  return (
    <div className="space-y-7">
      <PageHeader eyebrow="System" title="Settings" text="Where your data lives, and tools to reset the demo." />

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-md ${local ? 'bg-amber-400/10 text-amber-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
              {local ? <HardDrive size={20} /> : <Database size={20} />}
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{local ? 'Demo data in this browser' : 'Connected to PostgreSQL'}</h2>
              <p className="text-sm text-[var(--text-muted)]">
                {local ? 'No API or database was reachable, so the demo saves to local storage.' : 'Changes are saved through the Express API.'}
              </p>
            </div>
          </div>
          <label className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-white/[0.035] px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-[var(--text-primary)]">Always use browser demo data</span>
              <span className="block text-xs text-[var(--text-muted)]">Skip the server even when it's running. Takes effect on reload.</span>
            </span>
            <input
              type="checkbox"
              defaultChecked={forced}
              onChange={(e) => {
                if (e.target.checked) localStorage.setItem('schedulai.mode', 'local');
                else localStorage.removeItem('schedulai.mode');
                window.location.reload();
              }}
              className="h-5 w-5 accent-brand-700"
            />
          </label>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-400/10 text-brand-300">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Demo accounts</h2>
              <p className="text-sm text-[var(--text-muted)]">Share these with anyone who wants to try the demo.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-2 font-mono text-sm">
            {DEMO_ACCOUNTS.map((a) => (
              <div key={a.role} className="flex flex-wrap items-center gap-2 rounded-md bg-white/[0.03] px-4 py-3">
                <span className="w-16 font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{a.role}</span>
                <code className="text-brand-300">{a.email}</code>
                <code className="text-sky-300">{a.password}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Reset</h2>
        <p className="text-sm text-[var(--text-muted)]">{local ? 'Affects only this browser.' : 'Browser data resets do not touch the PostgreSQL database.'}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={clearTimetable} className="btn btn-ghost">
            <RotateCcw size={16} /> Clear imported teaching allocations
          </button>
          {local && (
            <>
              <button
                onClick={() => {
                  resetLocalDb(false);
                  notifyDataChanged();
                  toast('Demo campus restored');
                }}
                className="btn btn-ghost"
              >
                <RotateCcw size={16} /> Restore demo campus
              </button>
              <button
                onClick={() => {
                  if (!window.confirm('Remove all faculty, rooms, sections and subjects from this browser?')) return;
                  resetLocalDb(true);
                  clearTimetable();
                  notifyDataChanged();
                }}
                className="btn btn-danger"
              >
                <Trash2 size={16} /> Start with an empty campus
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
