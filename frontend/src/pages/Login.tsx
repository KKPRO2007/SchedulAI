import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookUser, CalendarCheck2, CalendarHeart, Eye, EyeOff, History, Loader2, Lock, LogIn, Mail, ShieldCheck, Workflow } from 'lucide-react';
import Scene3D from '../components/three/LazyScene';
import Logo, { LogoMark } from '../components/fx/Logo';
import { DEMO_ACCOUNTS, login, ROLE_LABEL } from '../lib/auth';
import { homeFor } from '../components/layout/nav';
import { navigate } from '../lib/router';

type Account = (typeof DEMO_ACCOUNTS)[number];

const ROLE_ICON = { admin: ShieldCheck, coordinator: Workflow, faculty: CalendarHeart, student: BookUser };

const POINTS = [
  { icon: CalendarCheck2, title: 'Clash-free by construction', text: 'Seven hard constraints are checked on every run.' },
  { icon: ShieldCheck, title: 'Approval before publication', text: 'Only an administrator can publish a timetable.' },
  { icon: History, title: 'Every change on record', text: 'Imports, approvals and requests go to the audit log.' },
];

/** One-screen sign-in: brand panel on the left, a glass card with role picker and form on the right. */
export default function Login({ preset }: { preset: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [picked, setPicked] = useState<Account['role'] | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(`/app/${homeFor(user.role)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setBusy(false);
    }
  }

  /** Types the account into the form so it's obvious what got filled in. */
  function fill(a: Account) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPicked(a.role);
    setError('');
    setEmail('');
    setPassword('');
    let t = 0;
    for (let i = 1; i <= a.email.length; i++) timers.current.push(window.setTimeout(() => setEmail(a.email.slice(0, i)), (t += 12)));
    for (let i = 1; i <= a.password.length; i++) timers.current.push(window.setTimeout(() => setPassword(a.password.slice(0, i)), (t += 22)));
  }

  useEffect(() => {
    const a = DEMO_ACCOUNTS.find((x) => x.role === preset);
    if (!a) return;
    const id = window.setTimeout(() => fill(a), 250);
    return () => clearTimeout(id);
  }, [preset]);

  const pickedAccount = DEMO_ACCOUNTS.find((a) => a.role === picked);

  return (
    <div className="relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <Scene3D variant="auth" />

      <header className="flex w-full shrink-0 items-center justify-between px-4 py-4 sm:px-8 lg:px-12 2xl:px-20">
        <a href="#/" aria-label="SchedulAI home">
          <Logo size={34} />
        </a>
        <button onClick={() => navigate('/')} className="btn btn-ghost px-3 py-1.5 text-xs">
          <ArrowLeft size={14} /> Back to home
        </button>
      </header>

      <main className="grid w-full flex-1 items-center gap-10 px-4 pb-6 sm:px-8 lg:px-12 2xl:px-20 lg:min-h-0 lg:grid-cols-[1fr_440px] lg:gap-16 xl:grid-cols-[1fr_460px] 2xl:gap-24">
        {/* Brand panel */}
        <section className="hidden animate-fade-up lg:block">
          <LogoMark size={64} />
          <h1 className="font-serif mt-7 max-w-md text-[2.6rem] font-semibold leading-[1.1] text-white">Welcome back to your timetable office.</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--text-secondary)]">Sign in to generate, review and publish clash-free timetables for every section, teacher and room.</p>
          <ul className="mt-8 max-w-md space-y-4">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-sky-300">
                  <p.icon size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{p.title}</span>
                  <span className="block text-sm text-[var(--text-muted)]">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Sign-in card */}
        <section className="glass-strong mx-auto w-full max-w-[440px] animate-fade-up rounded-2xl p-6 sm:p-7" style={{ animationDelay: '60ms' }}>
          <div className="mb-5 flex justify-center lg:hidden">
            <LogoMark size={48} />
          </div>
          <h2 className="font-serif text-center text-[1.65rem] font-semibold text-white lg:text-left">Sign in</h2>
          <p className="mt-1 text-center text-sm text-[var(--text-secondary)] lg:text-left">Choose a demo role, or enter your details.</p>

          <div className="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Demo role">
            {DEMO_ACCOUNTS.map((a) => {
              const Icon = ROLE_ICON[a.role];
              const active = picked === a.role;
              return (
                <button
                  key={a.role}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => fill(a)}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${active ? 'border-sky-400/60 bg-sky-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${active ? 'bg-gradient-to-br from-sky-400 to-brand-600 text-white' : 'bg-white/[0.06] text-[var(--text-secondary)]'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{ROLE_LABEL[a.role]}</span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">{a.name}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Email address</span>
              <span className="relative block">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" className="form-input pl-9" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Password</span>
              <span className="relative block">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="form-input px-9" />
                <button type="button" onClick={() => setShow((s) => !s)} className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy || !email || !password} className="btn btn-primary w-full py-2.5">
              {busy ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />}
              {busy ? 'Signing in…' : pickedAccount ? `Sign in as ${ROLE_LABEL[pickedAccount.role]}` : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-5 text-[var(--text-muted)]">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
            {pickedAccount ? pickedAccount.blurb : 'Access is checked on the server for every request. Demo accounts use synthetic data only.'}
          </p>
        </section>
      </main>
    </div>
  );
}
