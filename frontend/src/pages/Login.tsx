import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarHeart, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import Scene3D from '../components/three/Scene3D';
import Logo from '../components/fx/Logo';
import { DEMO_ACCOUNTS, login } from '../lib/auth';
import { navigate } from '../lib/router';

type Account = (typeof DEMO_ACCOUNTS)[number];

export default function Login({ preset }: { preset: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const [error, setError] = useState('');
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function submit(e?: React.FormEvent, creds = { email, password }) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(creds.email, creds.password);
      navigate(user.role === 'faculty' ? '/app/schedule' : '/app/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setBusy(false);
    }
  }

  /** Types the account's credentials in like a person would, then optionally signs in. */
  function fill(account: Account, andSubmit: boolean) {
    timers.current.forEach(clearTimeout);
    if (andSubmit) {
      // a click signs in straight away; the typing animation is only for the preset
      setTyping(null);
      setEmail(account.email);
      setPassword(account.password);
      void submit(undefined, account);
      return;
    }
    setTyping(account.role);
    setError('');
    setEmail('');
    setPassword('');
    let t = 0;
    for (let i = 1; i <= account.email.length; i++) timers.current.push(window.setTimeout(() => setEmail(account.email.slice(0, i)), (t += 24)));
    t += 100;
    for (let i = 1; i <= account.password.length; i++) timers.current.push(window.setTimeout(() => setPassword(account.password.slice(0, i)), (t += 40)));
    timers.current.push(
      window.setTimeout(() => {
        setTyping(null);
        if (andSubmit) submit(undefined, account);
      }, t + 220)
    );
  }

  useEffect(() => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === preset);
    if (!account) return;
    const id = window.setTimeout(() => fill(account, false), 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  return (
    <div className="relative grid min-h-screen grid-cols-1 overflow-x-hidden lg:grid-cols-[1fr_1.05fr]">
      <Scene3D variant="auth" />

      <div className="relative flex min-w-0 flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <a href="#/">
            <Logo size={36} />
          </a>
          <button onClick={() => navigate('/')} className="btn btn-ghost px-3 py-2 text-xs">
            <ArrowLeft size={14} /> Home
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="glass relative w-full min-w-0 max-w-md animate-fade-up rounded-[1.75rem] p-5 sm:p-9">
            <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
            <p className="eyebrow">Free demo</p>
            <h1 className="font-display mt-2 text-3xl font-bold text-white">Sign in to SchedulAI</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Pick a demo role. Each one sees a different side of the product.</p>

            <div className="mt-6 grid gap-3">
              {DEMO_ACCOUNTS.map((a) => {
                const Icon = a.role === 'admin' ? ShieldCheck : CalendarHeart;
                const active = typing === a.role || preset === a.role;
                return (
                  <button
                    key={a.role}
                    type="button"
                    onClick={() => fill(a, true)}
                    disabled={busy}
                    className={`group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition disabled:opacity-70 ${
                      active ? 'border-violet-300/60 bg-violet-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${a.role === 'admin' ? 'from-violet-500 to-indigo-500' : 'from-sky-500 to-emerald-400'}`}>
                      {typing === a.role ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-white">
                        {a.role === 'admin' ? 'Admin demo' : 'Faculty demo'}
                        <span className="text-xs font-normal text-[var(--text-muted)]">· {a.name}</span>
                      </span>
                      <span className="block text-xs leading-5 text-[var(--text-secondary)]">{a.blurb}</span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-[var(--text-muted)]">
                        {a.email} · {a.password}
                      </span>
                    </span>
                    <ArrowRight size={18} className="shrink-0 text-violet-200 transition group-hover:translate-x-1" />
                  </button>
                );
              })}
            </div>

            <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              <span className="h-px flex-1 bg-white/10" /> or type it in <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Email</span>
                <span className="relative block">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" className="form-input pl-10" />
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Password</span>
                <span className="relative block">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="form-input px-10" />
                  <button type="button" onClick={() => setShow((s) => !s)} className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>

              {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">{error}. Try one of the demo accounts above.</p>}

              <button type="submit" disabled={busy || Boolean(typing)} className="btn btn-primary w-full py-3">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center text-xs text-[var(--text-muted)]">Demo data stays in this browser when no server is connected.</p>
      </div>

      <div className="relative hidden items-center justify-center p-10 lg:flex">
        <div className="w-full max-w-lg animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <p className="font-display text-5xl font-bold leading-tight text-white">
            One timetable.
            <br />
            <span className="text-gradient">Two points of view.</span>
          </p>
          <div className="mt-10 grid gap-4">
            <RoleCard
              icon={ShieldCheck}
              tone="from-violet-500 to-indigo-500"
              title="Admin"
              points={['Import Excel, CSV, ODS or JSON', 'Manage faculty, rooms, sections, subjects', 'Generate and publish the campus timetable']}
            />
            <RoleCard icon={CalendarHeart} tone="from-sky-500 to-emerald-400" title="Faculty" points={['See today’s classes and what’s next', 'Your week, rooms and sections at a glance', 'Download as PDF, Excel or calendar']} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon: Icon, tone, title, points }: { icon: typeof ShieldCheck; tone: string; title: string; points: string[] }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tone} text-white`}>
          <Icon size={17} />
        </span>
        <p className="font-display text-lg font-semibold text-white">{title}</p>
      </div>
      <ul className="mt-3 space-y-1.5 pl-12 text-sm text-[var(--text-secondary)]">
        {points.map((p) => (
          <li key={p} className="list-disc">
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
