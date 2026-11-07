import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookUser, CalendarHeart, Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import Scene3D from '../components/three/Scene3D';
import Logo from '../components/fx/Logo';
import { DEMO_ACCOUNTS, login, ROLE_LABEL } from '../lib/auth';
import { homeFor } from '../components/layout/nav';
import { navigate } from '../lib/router';

type Account = (typeof DEMO_ACCOUNTS)[number];

const ROLE_ICON = { admin: ShieldCheck, coordinator: Workflow, faculty: CalendarHeart, student: BookUser };
const ROLE_TONE = { admin: 'from-violet-500 to-indigo-500', coordinator: 'from-fuchsia-500 to-violet-500', faculty: 'from-sky-500 to-emerald-400', student: 'from-amber-500 to-orange-500' };

/** Left: what each role does (click to fill). Right: a plain sign-in form. */
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
    for (let i = 1; i <= a.email.length; i++) timers.current.push(window.setTimeout(() => setEmail(a.email.slice(0, i)), (t += 18)));
    for (let i = 1; i <= a.password.length; i++) timers.current.push(window.setTimeout(() => setPassword(a.password.slice(0, i)), (t += 30)));
  }

  useEffect(() => {
    const a = DEMO_ACCOUNTS.find((x) => x.role === preset);
    if (!a) return;
    const id = window.setTimeout(() => fill(a), 300);
    return () => clearTimeout(id);
  }, [preset]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Scene3D variant="auth" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <a href="#/">
          <Logo size={36} />
        </a>
        <button onClick={() => navigate('/')} className="btn btn-ghost px-3 py-2 text-xs">
          <ArrowLeft size={14} /> Home
        </button>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-12 pt-2 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-10 lg:pt-8">
        {/* Roles */}
        <section className="animate-fade-up">
          <p className="eyebrow">Free demo · 4 roles</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-white sm:text-4xl">Choose who you are</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Each role sees a different part of SchedulAI. Tap one and its demo login is filled in for you.</p>

          <div className="mt-6 space-y-2.5">
            {DEMO_ACCOUNTS.map((a) => {
              const Icon = ROLE_ICON[a.role];
              const active = picked === a.role;
              return (
                <button
                  key={a.role}
                  type="button"
                  onClick={() => fill(a)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${active ? 'border-violet-300/60 bg-violet-500/15' : 'glass hover:border-white/25'}`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${ROLE_TONE[a.role]}`}>
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold text-white">{ROLE_LABEL[a.role]}</span>
                      <span className="text-xs text-[var(--text-muted)]">{a.name}</span>
                    </span>
                    <span className="mt-0.5 block text-sm leading-5 text-[var(--text-secondary)]">{a.blurb}</span>
                  </span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${active ? 'border-violet-300 bg-violet-500 text-white' : 'border-white/15 text-transparent'}`}>
                    <Check size={14} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Form */}
        <section className="glass relative animate-fade-up rounded-[1.75rem] p-6 sm:p-8 lg:sticky lg:top-8" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
          <h2 className="font-display text-2xl font-bold text-white">Sign in</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{picked ? `Signing in as ${ROLE_LABEL[picked]}.` : 'Pick a role, or type the details yourself.'}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
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

            {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">{error}</p>}

            <button type="submit" disabled={busy || !email || !password} className="btn btn-primary w-full py-3">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-white/5 bg-black/20 p-4 text-xs">
            <p className="font-semibold uppercase tracking-wider text-[var(--text-muted)]">Demo logins</p>
            <ul className="mt-2 space-y-1 font-mono">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.role} className="flex flex-wrap justify-between gap-x-3 text-[var(--text-secondary)]">
                  <span className="text-violet-200">{a.email}</span>
                  <span className="text-sky-200">{a.password}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
