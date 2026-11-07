import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookUser,
  CalendarHeart,
  CalendarPlus,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  DoorOpen,
  Eye,
  FileSpreadsheet,
  FlaskConical,
  GraduationCap,
  History,
  LayoutPanelTop,
  MapPin,
  Replace,
  Scale,
  ScrollText,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Wand2,
  Workflow,
} from 'lucide-react';
import Scene3D from '../components/three/Scene3D';
import Reveal from '../components/fx/Reveal';
import CountUp from '../components/fx/CountUp';
import Logo from '../components/fx/Logo';
import { navigate } from '../lib/router';
import { DEMO_ACCOUNTS, ROLE_LABEL } from '../lib/auth';
import { SUBJECT_COLORS } from '../lib/timetableStyle';

const FORMATS = ['.xlsx', '.xls', '.csv', '.ods', '.tsv', '.json', '.xlsb', '.xlsm', '.txt'];

const PRINCIPLES = [
  { icon: ShieldCheck, title: 'Correctness before optimisation', text: 'A high-scoring schedule is still rejected if it breaks a mandatory rule. Seven hard constraints are checked before anything is ranked.' },
  { icon: Eye, title: 'Visibility before automation', text: 'Every score comes with its breakdown and the observations behind it, so a coordinator can see why one candidate beats another.' },
  { icon: History, title: 'Controlled change, not silent replacement', text: 'Drafts go through submission, approval and publication. A published timetable is archived, never overwritten.' },
];

const FEATURES = [
  { icon: UploadCloud, title: 'Import wizard', text: 'Excel, CSV, ODS or JSON with any file name. Columns are mapped automatically and previewed before anything is saved.' },
  { icon: Wand2, title: 'Validation first', text: 'Missing identifiers, duplicates and impossible values are caught before solving, with clear reasons per row.' },
  { icon: CalendarRange, title: 'Constraint-aware generation', text: 'Most-constrained activities are placed first; labs get 2-hour blocks in lab rooms across up to four shifts.' },
  { icon: Scale, title: 'Explainable scoring', text: 'Three candidates are ranked by workload balance, preferences, room use, compactness and stability, with adjustable weights.' },
  { icon: Replace, title: 'Substitution support', text: 'When someone is absent, free teachers are ranked by subject competency, department, spare workload and preference.' },
  { icon: ScrollText, title: 'Audit history', text: 'Generation, approval, publication, imports and requests are logged with the actor and time.' },
];

const LAYERS = [
  { icon: LayoutPanelTop, name: 'Presentation', tech: 'React · TypeScript · Tailwind', items: ['Admin & coordinator workspace', 'Faculty and student portals', 'Import wizard, grids, 3D views'] },
  { icon: ServerCog, name: 'Application / API', tech: 'Node.js · Express · JWT', items: ['Role-based access on every call', 'Import validation & bulk upsert', 'Versions, approvals, requests'] },
  { icon: Sparkles, name: 'Intelligence', tech: 'Constraint engine · scoring', items: ['Hard / soft rule validator', 'Candidate generator', 'Substitution recommender'] },
  { icon: Database, name: 'Data', tech: 'PostgreSQL (Neon)', items: ['Master data', 'Timetable versions (JSONB)', 'Requests & audit log'] },
];

const FLOW = ['Setup', 'Import', 'Validate', 'Configure rules', 'Generate', 'Review score', 'Approve', 'Publish', 'Notify', 'Monitor requests'];

const ROLES = [
  { role: 'admin' as const, icon: ShieldCheck, tone: 'from-violet-500 to-indigo-500', text: 'Institution settings, master data, approval and publication, audit log.' },
  { role: 'coordinator' as const, icon: Workflow, tone: 'from-fuchsia-500 to-violet-500', text: 'Imports data, sets rule weights, generates and compares candidates, plans substitutes.' },
  { role: 'faculty' as const, icon: CalendarHeart, tone: 'from-sky-500 to-emerald-400', text: 'Personal timetable and workload, preferred teaching window, change requests.' },
  { role: 'student' as const, icon: BookUser, tone: 'from-amber-500 to-orange-500', text: 'Read-only published timetable for their section, with downloads.' },
];

const TEAM = ['Mallavarapu Krishna Koushik Reddy', 'Riya Mangal', 'Ashutosh Singh', 'Surbhi Agrawal', 'Gargi Saraswat'];

const FAQ = [
  { q: 'What makes it “AI-powered”?', a: 'A constraint-solving engine places every class without clashes, then candidates are ranked by a weighted soft score learned from institutional priorities. The deterministic validator always has the final say, so safety-critical checks stay predictable.' },
  { q: 'Do my files need a special template?', a: 'No. Headers are matched against 120+ common names, title rows above the header are skipped, and department codes like CSE or MECH are expanded. You can override what a sheet is in the preview.' },
  { q: 'What if no perfect timetable exists?', a: 'The generator never hides infeasibility. Unplaced hours are listed with the blocking reason (no free room, section over its shift capacity, no teacher under the workload limit) so you know what to relax.' },
  { q: 'Who can publish?', a: 'Coordinators create and submit drafts; only an administrator approves and publishes. The server enforces this with JWT role checks, so hiding a button is never the only protection.' },
  { q: 'Is any real student data used?', a: 'No. The demo uses a synthetic campus (5 departments, 22 sections, 45 faculty) so it is safe to explore and evaluate.' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Scene3D variant="hero" />

      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled ? 'glass-strong border-x-0 border-t-0' : 'border-b border-transparent'}`}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <a href="#/" aria-label="SchedulAI home">
            <Logo size={38} />
          </a>
          <div className="hidden items-center gap-7 text-sm text-[var(--text-secondary)] lg:flex">
            <a href="#tour" onClick={scrollTo('tour')} className="transition hover:text-white">Product</a>
            <a href="#how" onClick={scrollTo('how')} className="transition hover:text-white">How it works</a>
            <a href="#architecture" onClick={scrollTo('architecture')} className="transition hover:text-white">Architecture</a>
            <a href="#roles" onClick={scrollTo('roles')} className="transition hover:text-white">Roles</a>
            <a href="#faq" onClick={scrollTo('faq')} className="transition hover:text-white">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="btn btn-ghost hidden sm:inline-flex">Sign in</button>
            <button onClick={() => navigate('/login?as=coordinator')} className="btn btn-primary">
              Try free demo <ArrowRight size={16} />
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 pb-16 pt-28 sm:px-8 lg:grid-cols-[1fr_1.05fr]">
        <div className="animate-fade-up">
          <span className="chip border-violet-400/30 bg-violet-500/10 text-violet-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            AI-powered academic timetable & resource management
          </span>
          <h1 className="font-display mt-6 text-[2.6rem] font-bold leading-[1.05] text-white sm:text-6xl xl:text-7xl">
            Timetables that are
            <br />
            <span className="text-gradient">explainable & reliable.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
            SchedulAI brings institutional data, scheduling rules, rooms, faculty availability and workload into one controlled workspace. It generates clash-free candidates, explains their scores, and publishes only what an administrator approves.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => navigate('/login?as=coordinator')} className="btn btn-primary px-6 py-3.5 text-base">
              <Workflow size={18} /> Try as Coordinator
            </button>
            <button onClick={scrollTo('tour')} className="btn btn-ghost px-6 py-3.5 text-base">
              See it in action
            </button>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-2 text-xs">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.role} onClick={() => navigate(`/login?as=${a.role}`)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-white/25">
                <p className="font-semibold uppercase tracking-wider text-[var(--text-muted)]">{ROLE_LABEL[a.role]}</p>
                <p className="mt-1 truncate font-mono text-violet-200">{a.email}</p>
                <p className="font-mono text-sky-200">{a.password}</p>
              </button>
            ))}
          </div>
        </div>

        <HeroVisual />

        <button onClick={scrollTo('principles')} className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[var(--text-muted)] md:flex" aria-label="Scroll down">
          Scroll
          <span className="flex h-9 w-5 justify-center rounded-full border border-white/20 pt-1.5">
            <span className="h-2 w-1 animate-bounce rounded-full bg-white/60" />
          </span>
        </button>
      </section>

      <section className="relative border-y border-white/5 bg-white/[0.015] py-5" aria-label="Supported file formats">
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]">
          <div className="flex w-max animate-marquee gap-4">
            {[...FORMATS, ...FORMATS, ...FORMATS, ...FORMATS].map((f, i) => (
              <span key={i} className="chip px-4 py-1.5 font-mono text-sm">
                <FileSpreadsheet size={14} className="text-sky-300" /> {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & principles */}
      <section id="principles" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-8">
        <Reveal>
          <p className="eyebrow">Vision</p>
          <h2 className="font-display mt-3 max-w-4xl text-3xl font-bold text-white sm:text-5xl">Make academic scheduling explainable, adaptable and operationally reliable.</h2>
          <p className="mt-4 max-w-3xl text-[var(--text-secondary)]">
            Manual timetables are time-consuming and fragile: one changed teacher or room can introduce several hidden clashes. SchedulAI treats the timetable as a structured optimisation problem, with coordinators kept in control.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 100}>
              <div className="glass h-full rounded-3xl p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-400 text-white">
                  <p.icon size={20} />
                </span>
                <h3 className="font-display mt-5 text-lg font-semibold text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { v: 4, s: '', l: 'roles with their own workspace' },
            { v: 7, s: '', l: 'hard constraints checked every run' },
            { v: 4, s: '', l: 'academic shifts supported' },
            { v: 100, s: '%', l: 'of demo hours placed, 0 clashes' },
          ].map((s, i) => (
            <Reveal key={s.l} delay={i * 80}>
              <div className="glass h-full rounded-2xl p-5">
                <p className="font-display text-3xl font-bold text-white sm:text-4xl">
                  <CountUp value={s.v} suffix={s.s} />
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)] sm:text-sm">{s.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Product tour */}
      <section id="tour" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-8">
        <Reveal>
          <p className="eyebrow">Product tour</p>
          <h2 className="font-display mt-3 max-w-3xl text-3xl font-bold text-white sm:text-5xl">From a messy folder to a published week.</h2>
        </Reveal>
        <Reveal delay={100}>
          <ProductTour />
        </Reveal>
      </section>

      {/* Workflow */}
      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-8">
        <Reveal>
          <p className="eyebrow">Operational flow</p>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-5xl">Ten steps, one controlled path.</h2>
          <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">Draft and published versions stay separate, so an unfinished experiment is never visible to students.</p>
        </Reveal>
        <Reveal delay={100}>
          <ol className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {FLOW.map((step, i) => (
              <li key={step} className={`glass relative rounded-2xl p-4 ${i >= 6 && i <= 7 ? 'border-emerald-400/30' : ''}`}>
                <span className="font-display text-xs font-bold text-violet-300">{String(i + 1).padStart(2, '0')}</span>
                <p className="mt-1 text-sm font-semibold text-white">{step}</p>
              </li>
            ))}
          </ol>
        </Reveal>
        <div className="mt-10 grid items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="glass rounded-3xl p-6">
              <p className="eyebrow">Scoring model</p>
              <p className="font-display mt-3 text-lg font-semibold leading-8 text-white sm:text-xl">
                Score = <span className="text-sky-200">0.30</span> × workload balance + <span className="text-sky-200">0.20</span> × preference + <span className="text-sky-200">0.20</span> × room use + <span className="text-sky-200">0.15</span> ×
                compactness + <span className="text-sky-200">0.15</span> × stability
              </p>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Weights are configurable per institution and shown with every result. Candidates that break a hard rule are never ranked.</p>
              <div className="mt-5 space-y-2">
                {[
                  ['Workload balance', 0.3, 0.81],
                  ['Preference satisfaction', 0.2, 0.79],
                  ['Room utilisation', 0.2, 0.93],
                  ['Compactness', 0.15, 0.87],
                  ['Stability', 0.15, 1],
                ].map(([l, w, v]) => (
                  <div key={l as string}>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>
                        {l} <span className="text-[var(--text-muted)]">× {(w as number).toFixed(2)}</span>
                      </span>
                      <span className="text-white">{Math.round((v as number) * 100)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full bg-[#3987e5]" style={{ width: `${(v as number) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <MappingDemo />
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-8">
        <Reveal>
          <p className="eyebrow">Functional modules</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold text-white sm:text-5xl">Everything a timetable office needs.</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div className="glass relative h-full overflow-hidden rounded-3xl p-6 sm:p-7">
                <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-violet-500/15 blur-2xl" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                  <f.icon size={22} />
                </div>
                <h3 className="font-display relative mt-5 text-xl font-semibold text-white">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-6 text-[var(--text-secondary)]">{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-8">
        <Reveal>
          <p className="eyebrow">Architecture</p>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-5xl">Four layers, clear contracts.</h2>
          <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">The solver is separated from the interface, so the search strategy can change without touching coordinator, faculty or student screens.</p>
        </Reveal>
        <div className="mt-10 space-y-3">
          {LAYERS.map((l, i) => (
            <Reveal key={l.name} delay={i * 90}>
              <div className="glass grid gap-4 rounded-2xl p-5 sm:grid-cols-[220px_1fr] sm:items-center" style={{ marginLeft: `min(${i * 3}%, ${i * 24}px)` }}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-violet-200">
                    <l.icon size={20} />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-white">{l.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{l.tech}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.items.map((t) => (
                    <span key={t} className="chip px-3 py-1 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-24 sm:px-8">
        <Reveal>
          <p className="eyebrow">User roles</p>
          <h2 className="font-display mt-3 text-3xl font-bold text-white sm:text-5xl">Everyone gets the view they need.</h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((r, i) => (
            <Reveal key={r.role} delay={i * 90}>
              <div className="glass relative flex h-full flex-col overflow-hidden rounded-3xl p-6">
                <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br ${r.tone} opacity-20 blur-3xl`} />
                <span className={`relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${r.tone} text-white`}>
                  <r.icon size={20} />
                </span>
                <h3 className="font-display relative mt-5 text-2xl font-bold text-white">{ROLE_LABEL[r.role]}</h3>
                <p className="relative mt-2 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{r.text}</p>
                <button onClick={() => navigate(`/login?as=${r.role}`)} className="btn btn-ghost relative mt-6 justify-between">
                  Open demo <ArrowRight size={16} />
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-24 sm:px-8">
        <Reveal>
          <p className="eyebrow text-center">FAQ</p>
          <h2 className="font-display mt-3 text-center text-3xl font-bold text-white sm:text-4xl">Good questions</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="glass group rounded-2xl px-5 py-4 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
                  {f.q}
                  <ChevronDown size={18} className="shrink-0 text-[var(--text-muted)] transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-8">
        <Reveal>
          <div className="glass relative overflow-hidden rounded-[2rem] p-8 text-center sm:p-12">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(124,92,255,0.3),transparent_60%)]" />
            <div className="grid-fade absolute inset-0 -z-10" />
            <GraduationCap className="mx-auto text-violet-300" size={32} />
            <p className="eyebrow mt-4">B.Tech CSE major project · 2026-27</p>
            <h2 className="font-display mt-2 text-2xl font-bold text-white sm:text-4xl">Department of Computer Engineering & Applications, GLA University, Mathura</h2>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Under the supervision of <span className="font-semibold text-white">Mr. Piyush Khandelwal</span>
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {TEAM.map((n) => (
                <span key={n} className="chip px-3 py-1.5 text-xs text-white">
                  <Users size={12} className="text-violet-300" /> {n}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={() => navigate('/login?as=admin')} className="btn btn-primary px-6 py-3">
                <ShieldCheck size={18} /> Admin demo
              </button>
              <button onClick={() => navigate('/login?as=coordinator')} className="btn btn-ghost px-6 py-3">
                <Workflow size={18} /> Coordinator demo
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-[var(--text-muted)] sm:flex-row sm:px-8 sm:text-left">
          <Logo size={30} />
          <p>
            © {new Date().getFullYear()} SchedulAI · GLA University ·{' '}
            <a href="https://github.com/KKPRO2007/SchedulAI" target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-white hover:underline">
              Source on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function scrollTo(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
}

/* ------------------------------------------------------------------ */

const WEEK: (string | null)[][] = [
  ['DS', 'OS', null, 'CN', 'DB'],
  [null, 'DB', 'DS', 'LAB', 'ML'],
  ['OS', null, 'CN', 'LAB', null],
  ['LUNCH', 'LUNCH', 'LUNCH', 'LUNCH', 'LUNCH'],
  ['CN', 'DS', 'DB', null, 'OS'],
];
const CODE_COLOR: Record<string, number> = { DS: 0, OS: 5, CN: 2, DB: 1, LAB: 4, ML: 3 };

function MiniWeek({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
        <p key={d} className="text-center text-[10px] font-semibold text-[var(--text-muted)]">
          {d}
        </p>
      ))}
      {WEEK.flatMap((row, r) =>
        row.map((c, k) =>
          c === 'LUNCH' ? (
            <div key={`${r}-${k}`} className={`rounded-md ${compact ? 'h-3' : 'h-4'}`} style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 4px, transparent 4px 8px)' }} />
          ) : (
            <div
              key={`${r}-${k}`}
              className={`flex items-center justify-center rounded-lg text-[10px] font-bold text-white ${compact ? 'h-8' : 'h-10'} ${c ? '' : 'border border-dashed border-white/10'}`}
              style={c ? { background: `linear-gradient(150deg, ${SUBJECT_COLORS[CODE_COLOR[c]]}dd, ${SUBJECT_COLORS[CODE_COLOR[c]]}88)` } : undefined}
            >
              {c}
            </div>
          )
        )
      )}
    </div>
  );
}

/** Layered product cards with gentle automatic motion (no pointer tracking). */
function HeroVisual() {
  return (
    <div className="perspective relative mx-auto hidden h-[540px] w-full max-w-[580px] lg:block" aria-hidden="true">
      <div className="preserve-3d absolute inset-0 animate-[hero-sway_14s_ease-in-out_infinite]" style={{ transform: 'rotateY(-14deg) rotateX(8deg)' }}>
        {/* main window */}
        <div className="glass absolute left-4 top-14 w-[460px] overflow-hidden rounded-3xl" style={{ transform: 'translateZ(0px)' }}>
          <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-3 text-[10px] text-[var(--text-muted)]">schedulai.app / timetable / CSE-5A</span>
          </div>
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Week view</p>
                <p className="font-display text-lg font-semibold text-white">CSE-5A · Shift 1</p>
              </div>
              <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 size={12} /> 0 clashes
              </span>
            </div>
            <MiniWeek />
          </div>
        </div>

        <div className="glass absolute -right-4 top-0 w-52 animate-float rounded-2xl p-4" style={{ transform: 'translateZ(90px)' }}>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Hours placed</p>
          <p className="font-display mt-1 text-3xl font-bold text-white">
            355<span className="text-base text-[var(--text-muted)]">/355</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400" />
          </div>
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">22 sections · solved in 9 ms</p>
        </div>

        <div className="glass absolute -left-6 bottom-6 w-64 animate-float-slow rounded-2xl p-4" style={{ transform: 'translateZ(130px)' }}>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">
            <Clock size={12} /> Up next · Dr. Priya Sharma
          </p>
          <p className="font-display mt-2 text-lg font-semibold text-white">Operating Systems</p>
          <div className="mt-2 flex gap-3 text-[11px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <MapPin size={11} /> A-201
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap size={11} /> CSE-5A
            </span>
            <span>10:00 AM</span>
          </div>
        </div>

        <div className="glass absolute bottom-24 right-2 flex animate-float items-center gap-2 rounded-2xl px-4 py-3" style={{ transform: 'translateZ(60px)', animationDelay: '1.5s' }}>
          <FlaskConical size={16} className="text-fuchsia-300" />
          <span className="text-xs font-semibold text-white">Labs in 2-hour blocks</span>
        </div>
      </div>
      <style>{`@keyframes hero-sway{0%,100%{transform:rotateY(-14deg) rotateX(8deg)}50%{transform:rotateY(-8deg) rotateX(5deg)}}`}</style>
    </div>
  );
}

const TOUR = [
  { id: 'import', label: 'Smart import', icon: UploadCloud },
  { id: 'timetable', label: 'Campus timetable', icon: CalendarRange },
  { id: 'faculty', label: 'Faculty view', icon: CalendarHeart },
] as const;

/** Auto-advancing tabbed preview of the three main screens. */
function ProductTour() {
  const [tab, setTab] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setTab((x) => (x + 1) % TOUR.length), 5500);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div className="mt-10">
      <div className="flex flex-wrap gap-2">
        {TOUR.map((t, i) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(i);
              setPaused(true);
            }}
            className={`relative flex items-center gap-2 overflow-hidden rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${tab === i ? 'border-white/20 bg-white/10 text-white' : 'border-white/5 text-[var(--text-secondary)]'}`}
          >
            <t.icon size={16} /> {t.label}
            {tab === i && !paused && <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-[tour-progress_5.5s_linear] bg-gradient-to-r from-violet-400 to-sky-400" />}
          </button>
        ))}
      </div>
      <style>{`@keyframes tour-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>

      <div className="glass mt-5 overflow-hidden rounded-[1.75rem]">
        <div className="flex items-center gap-1.5 border-b border-white/5 px-5 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 rounded-md bg-black/30 px-3 py-1 font-mono text-[11px] text-[var(--text-muted)]">schedulai.app/app/{TOUR[tab].id}</span>
        </div>
        <div key={tab} className="min-h-[380px] p-5 sm:p-7" style={{ animation: 'fade-up .5s both' }}>
          {tab === 0 && <TourImport />}
          {tab === 1 && <TourTimetable />}
          {tab === 2 && <TourFaculty />}
        </div>
      </div>
    </div>
  );
}

function TourImport() {
  const files = [
    { n: 'Campus_Master_Data_2026.xlsx', s: '4 sheets → Faculty, Rooms, Sections, Subjects', c: '#16a34a' },
    { n: 'faculty list final (2).csv', s: '1 sheet → Faculty · 18 rows', c: '#7c3aed' },
    { n: 'ECE timetable input - sem 5.xlsx', s: 'Subjects + Faculty + Sections from one table', c: '#16a34a' },
  ];
  const cols = [
    ['Teacher Name', 'Faculty › name'],
    ['Mail ID', 'Faculty › email'],
    ['Dept.', 'Department'],
    ['Status', 'Faculty › available'],
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-dashed border-violet-400/40 bg-violet-500/[0.06] p-6 text-center">
          <UploadCloud className="mx-auto text-violet-300" size={30} />
          <p className="mt-2 text-sm font-semibold text-white">Drop files here</p>
          <p className="text-xs text-[var(--text-muted)]">.xlsx .xls .csv .ods .json …</p>
        </div>
        {files.map((f) => (
          <div key={f.n} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <span className="flex h-10 w-9 items-center justify-center rounded-md text-[9px] font-black text-white" style={{ background: f.c }}>
              {f.n.split('.').pop()?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{f.n}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{f.s}</p>
            </div>
            <CheckCircle2 size={16} className="ml-auto shrink-0 text-emerald-400" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Detected as Faculty · 96%</p>
        <div className="mt-4 space-y-2">
          {cols.map(([a, b]) => (
            <div key={a} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm">
              <code className="w-28 truncate font-mono text-sky-200">{a}</code>
              <ArrowRight size={14} className="text-[var(--text-muted)]" />
              <span className="text-white">{b}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {[
            ['Faculty', 54],
            ['Rooms', 35],
            ['Sections', 23],
            ['Subjects', 44],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white/[0.04] p-2">
              <p className="font-display text-xl font-bold text-white">{v}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TourTimetable() {
  const rows = ['CSE-3A', 'CSE-3B', 'CSE-3C', 'CSE-5A', 'CSE-7A', 'IT-3A', 'IT-5B', 'ECE-3A', 'ECE-5A', 'ME-3B', 'ME-5A', 'CE-3A'];
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['355h', 'all placed'],
            ['22', 'sections'],
            ['45', 'faculty'],
            ['9 ms', 'to solve'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <p className="font-display text-2xl font-bold text-white">{v}</p>
              <p className="text-xs text-[var(--text-muted)]">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <MiniWeek compact />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-black/20 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">All sections · Mon–Fri</p>
        <div className="space-y-1.5">
          {rows.map((r, ri) => (
            <div key={r} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] font-semibold text-white">{r}</span>
              <div className="flex gap-[3px]">
                {Array.from({ length: 30 }).map((_, i) => {
                  const on = (i * 7 + ri * 3) % 5 !== 0 && i % 6 !== 5;
                  return <span key={i} className="h-4 w-3 rounded-[3px] sm:w-3.5" style={{ background: on ? SUBJECT_COLORS[(i + ri) % 6] : 'rgba(255,255,255,0.05)', opacity: on ? 0.9 : 1 }} />;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Excel · every section', 'PDF', 'Calendar (.ics)', 'CSV'].map((d) => (
            <span key={d} className="chip">
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TourFaculty() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-sky-500/15 to-violet-500/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">Good morning</p>
          <p className="font-display mt-1 text-2xl font-bold text-white">Dr. Priya Sharma</p>
          <p className="text-xs text-[var(--text-secondary)]">Associate Professor · Computer Science</p>
        </div>
        {[
          ['9:00 AM', 'Data Structures', 'CSE-3A · A-102'],
          ['11:00 AM', 'Data Structures Lab', 'CSE-3C · B-LAB-1'],
          ['2:00 PM', 'Discrete Mathematics', 'CSE-3B · C-201'],
        ].map(([t, s, d], i) => (
          <div key={t} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <span className="h-9 w-1 rounded-full" style={{ background: SUBJECT_COLORS[i * 2] }} />
            <div>
              <p className="text-xs text-[var(--text-muted)]">{t}</p>
              <p className="text-sm font-semibold text-white">{s}</p>
              <p className="text-xs text-[var(--text-secondary)]">{d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/5 bg-black/20 p-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            [Clock, '13h', 'this week'],
            [Users, '3', 'sections'],
            [DoorOpen, '5', 'rooms'],
          ].map(([Icon, v, l]) => {
            const I = Icon as typeof Clock;
            return (
              <div key={l as string} className="rounded-xl bg-white/[0.04] p-3">
                <I size={15} className="text-[var(--text-muted)]" />
                <p className="font-display mt-1 text-xl font-bold text-white">{v as string}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{l as string}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <MiniWeek compact />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <CalendarPlus size={14} className="text-violet-300" /> Add my week to Google / Outlook / Apple Calendar
        </div>
      </div>
    </div>
  );
}

const PAIRS = [
  ['Teacher Name', 'Faculty › name'],
  ['Mail ID', 'Faculty › email'],
  ['Dept.', 'Department'],
  ['Room No', 'Room › name'],
  ['Strength', 'Section › students'],
  ['L-T-P', 'Subject › hours/week'],
];

function MappingDemo() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % PAIRS.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <p className="font-display font-semibold text-white">Column matching</p>
        <span className="chip">
          <Sparkles size={12} className="text-violet-300" /> live
        </span>
      </div>
      <div className="mt-5 space-y-2.5">
        {PAIRS.map(([from, to], i) => (
          <div
            key={from}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-500 ${i === active ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/5 bg-white/[0.02]'}`}
          >
            <code className="w-32 truncate font-mono text-sm text-sky-200">{from}</code>
            <ArrowRight size={15} className={i === active ? 'text-violet-300' : 'text-[var(--text-muted)]'} />
            <span className="text-sm text-white">{to}</span>
            {i <= active && <CheckCircle2 size={16} className="ml-auto text-emerald-400" />}
          </div>
        ))}
      </div>
    </div>
  );
}
