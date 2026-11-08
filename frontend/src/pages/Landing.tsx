import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookUser,
  CalendarCheck2,
  CalendarHeart,
  CalendarPlus,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  DoorOpen,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FlaskConical,
  GraduationCap,
  History,
  LayoutPanelTop,
  Lock,
  Menu,
  Replace,
  Scale,
  ScrollText,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wand2,
  Workflow,
  X,
} from 'lucide-react';
import Scene3D from '../components/three/LazyScene';
import Reveal from '../components/fx/Reveal';
import CountUp from '../components/fx/CountUp';
import Logo from '../components/fx/Logo';
import { navigate } from '../lib/router';
import { DEMO_ACCOUNTS, ROLE_LABEL } from '../lib/auth';
import { SUBJECT_COLORS } from '../lib/timetableStyle';

const FORMATS = ['.xlsx', '.xls', '.csv', '.ods', '.tsv', '.json'];

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
  { icon: LayoutPanelTop, name: 'Presentation', tech: 'React · TypeScript · Tailwind CSS', items: ['Admin & coordinator workspace', 'Faculty and student portals', 'Import wizard and timetable grids'] },
  { icon: ServerCog, name: 'Application / API', tech: 'Node.js · Express · JWT', items: ['Role-based access on every call', 'Import validation & bulk upsert', 'Versions, approvals, requests'] },
  { icon: Sparkles, name: 'Intelligence', tech: 'Constraint engine · scoring', items: ['Hard / soft rule validator', 'Candidate generator', 'Substitution recommender'] },
  { icon: Database, name: 'Data', tech: 'PostgreSQL', items: ['Master data', 'Timetable versions (JSONB)', 'Requests & audit log'] },
];

const FLOW = [
  { step: 'Set up & import', text: 'Faculty, rooms, sections and subjects from your existing spreadsheets.' },
  { step: 'Validate', text: 'Gaps and conflicts in the input are listed before solving.' },
  { step: 'Generate', text: 'Three clash-free candidates, each with a score breakdown.' },
  { step: 'Approve', text: 'A coordinator submits; only an administrator approves.' },
  { step: 'Publish', text: 'Faculty and students see the approved version. Changes go through requests.' },
];

const ROLES = [
  { role: 'admin' as const, icon: ShieldCheck, text: 'Institution settings, master data, approval and publication, audit log.' },
  { role: 'coordinator' as const, icon: Workflow, text: 'Imports data, sets rule weights, generates and compares candidates, plans substitutes.' },
  { role: 'faculty' as const, icon: CalendarHeart, text: 'Personal timetable and workload, preferred teaching window, change requests.' },
  { role: 'student' as const, icon: BookUser, text: 'Read-only published timetable for their section, with downloads.' },
];

const FAQ = [
  { q: 'What makes it “AI-powered”?', a: 'A constraint-solving engine places every class without clashes, then candidates are ranked by a weighted soft score that reflects institutional priorities. The deterministic validator always has the final say, so safety-critical checks stay predictable.' },
  { q: 'Do my files need a special template?', a: 'No. Headers are matched against 120+ common names, title rows above the header are skipped, and department codes like CSE or MECH are expanded. You can override what a sheet is in the preview.' },
  { q: 'What if no perfect timetable exists?', a: 'The generator never hides infeasibility. Unplaced hours are listed with the blocking reason (no free room, section over its shift capacity, no teacher under the workload limit) so you know what to relax.' },
  { q: 'Who can publish?', a: 'Coordinators create and submit drafts; only an administrator approves and publishes. The server enforces this with JWT role checks, so hiding a button is never the only protection.' },
  { q: 'Is any real student data used?', a: 'No. The demo uses a synthetic campus (5 departments, 22 sections, 45 faculty) so it is safe to explore and evaluate.' },
];

const NAV_LINKS = [
  ['overview', 'Overview'],
  ['how', 'How it works'],
  ['features', 'Features'],
  ['roles', 'Roles'],
  ['faq', 'FAQ'],
] as const;

export default function Landing() {
  const [menu, setMenu] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Scene3D variant="hero" />

      <header className="sticky top-0 z-40 bg-transparent">
        <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-8 lg:px-12 2xl:px-20">
          <a href="#/" aria-label="SchedulAI home">
            <Logo size={34} light />
          </a>
          <div className="hidden items-center gap-7 text-sm font-medium text-[var(--text-secondary)] lg:flex">
            {NAV_LINKS.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={scrollTo(id)} className="transition hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="btn btn-ghost hidden sm:inline-flex">
              Sign in
            </button>
            <button onClick={() => navigate('/login?as=coordinator')} className="btn btn-primary">
              Open demo <ArrowRight size={16} />
            </button>
            <button onClick={() => setMenu((m) => !m)} className="icon-btn lg:hidden" aria-label="Menu" aria-expanded={menu}>
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
        {menu && (
          <div className="chrome border-t border-[var(--line)] px-4 py-2 lg:hidden">
            {NAV_LINKS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  setMenu(false);
                  scrollTo(id)(e);
                }}
                className="block rounded-md px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-white/5"
              >
                {label}
              </a>
            ))}
            <button onClick={() => navigate('/login')} className="mt-1 block w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-brand-300 hover:bg-white/5 sm:hidden">
              Sign in
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative border-b border-[var(--line)]">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#04050c]/75 via-[#04050c]/35 to-transparent lg:w-[58%]" aria-hidden="true" />
        <div className="relative grid w-full items-center gap-12 px-4 pb-16 pt-12 sm:px-8 lg:px-12 2xl:px-20 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:pb-24">
          <div className="animate-fade-up">
            <span className="chip border-brand-400/30 bg-white/[0.04] text-brand-300">
              <ShieldCheck size={12} /> Academic timetable & resource management
            </span>
            <h1 className="font-serif mt-5 text-[2.35rem] font-semibold leading-[1.12] text-[var(--text-primary)] sm:text-5xl xl:text-[3.5rem]">
              Clash-free timetables, generated from rules <span className="text-gradient">you can check.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg sm:leading-8">
              SchedulAI brings faculty, rooms, sections and subjects into one controlled workspace. It validates your data, generates timetables without conflicts, explains every score, and publishes only what an administrator approves.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => navigate('/login?as=coordinator')} className="btn btn-primary px-5 py-3 text-[15px]">
                Try the coordinator demo <ArrowRight size={17} />
              </button>
              <button onClick={scrollTo('how')} className="btn btn-ghost px-5 py-3 text-[15px]">
                How it works
              </button>
            </div>
            <ul className="mt-8 grid max-w-lg gap-2.5 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
              {['7 hard constraints on every run', 'Approval before publication', 'Every change in an audit log', 'Excel, PDF and calendar exports'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Figures */}
      <section className="border-b border-[var(--line)]">
        <div className="grid w-full grid-cols-2 divide-[var(--line)] px-4 sm:px-8 lg:px-12 2xl:px-20 lg:grid-cols-4 lg:divide-x">
          {[
            { v: 4, s: '', l: 'roles, each with its own workspace' },
            { v: 7, s: '', l: 'hard constraints checked every run' },
            { v: 4, s: '', l: 'academic shifts supported' },
            { v: 100, s: '%', l: 'of demo hours placed with 0 clashes' },
          ].map((s) => (
            <div key={s.l} className="px-2 py-7 lg:px-8">
              <p className="font-serif text-4xl font-semibold text-white">
                <CountUp value={s.v} suffix={s.s} />
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Overview & principles */}
      <section id="overview" className="w-full scroll-mt-20 px-4 py-20 sm:px-8 lg:px-12 2xl:px-20">
        <Reveal>
          <SectionHead eyebrow="Overview" title="Make academic scheduling explainable and reliable.">
            Manual timetables take weeks and are fragile: one changed teacher or room can introduce several hidden clashes. SchedulAI treats the timetable as a structured optimisation problem, with coordinators kept in control at every step.
          </SectionHead>
        </Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 80}>
              <div className="h-full border-t-2 border-brand-400 pt-5">
                <p.icon size={22} className="text-brand-300" />
                <h3 className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{p.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Product tour */}
      <section className="border-y border-[var(--line)] bg-white/[0.02] py-20">
        <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-20">
          <Reveal>
            <SectionHead eyebrow="Product tour" title="From a folder of spreadsheets to a published week." />
          </Reveal>
          <Reveal delay={80}>
            <ProductTour />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="w-full scroll-mt-20 px-4 py-20 sm:px-8 lg:px-12 2xl:px-20">
        <Reveal>
          <SectionHead eyebrow="How it works" title="One controlled path from data to publication.">
            Draft and published versions are kept separate, so an unfinished experiment is never visible to students.
          </SectionHead>
        </Reveal>
        <Reveal delay={80}>
          <ol className="mt-12 grid gap-6 md:grid-cols-5 md:gap-4">
            {FLOW.map((f, i) => (
              <li key={f.step} className="relative">
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${i >= 3 ? 'bg-brand-500 text-white' : 'bg-brand-400/10 text-brand-300 ring-1 ring-brand-400/25'}`}>{i + 1}</span>
                  {i < FLOW.length - 1 && <span className="hidden h-px flex-1 bg-[var(--line-strong)] md:block" />}
                </div>
                <p className="mt-4 font-semibold text-[var(--text-primary)]">{f.step}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{f.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <div className="mt-16 grid items-start gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="card rounded-2xl p-6 sm:p-7">
              <p className="eyebrow">Scoring model</p>
              <p className="mt-3 font-mono text-[13px] leading-7 text-[var(--text-primary)] sm:text-sm">
                Score = <b className="text-brand-300">0.30</b> × workload balance + <b className="text-brand-300">0.20</b> × preference + <b className="text-brand-300">0.20</b> × room use + <b className="text-brand-300">0.15</b> × compactness + <b className="text-brand-300">0.15</b> × stability
              </p>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Weights are configurable per institution and shown with every result. Candidates that break a hard rule are never ranked.</p>
              <div className="mt-6 space-y-3">
                {(
                  [
                    ['Workload balance', 0.3, 0.81],
                    ['Preference satisfaction', 0.2, 0.79],
                    ['Room utilisation', 0.2, 0.93],
                    ['Compactness', 0.15, 0.87],
                    ['Stability', 0.15, 1],
                  ] as const
                ).map(([l, w, v]) => (
                  <div key={l}>
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>
                        {l} <span className="text-[var(--text-muted)]">× {w.toFixed(2)}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-[var(--text-primary)]">{Math.round(v * 100)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${v * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <MappingDemo />
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-y border-[var(--line)] bg-white/[0.02] py-20">
        <div className="w-full px-4 sm:px-8 lg:px-12 2xl:px-20">
          <Reveal>
            <SectionHead eyebrow="Features" title="Everything a timetable office needs." />
          </Reveal>
          <div className="glass-strong mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/[0.07] md:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#0b0e1f]/90 p-6 sm:p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-400/10 text-brand-300 ring-1 ring-brand-400/25">
                  <f.icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
            <Reveal>
              <div>
                <p className="eyebrow">Architecture</p>
                <h3 className="font-serif mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Four layers with clear contracts.</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">The solver is separate from the interface, so the search strategy can change without touching the coordinator, faculty or student screens. Every API call is checked against the user's role on the server.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <span key={f} className="chip bg-white/[0.04] font-mono">
                      <FileSpreadsheet size={12} className="text-emerald-300" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="card overflow-hidden rounded-2xl">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Layer</th>
                      <th className="hidden sm:table-cell">Technology</th>
                      <th>Responsibilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LAYERS.map((l) => (
                      <tr key={l.name}>
                        <td className="align-top">
                          <span className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                            <l.icon size={16} className="shrink-0 text-brand-300" /> {l.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--text-muted)] sm:hidden">{l.tech}</span>
                        </td>
                        <td className="hidden align-top text-xs sm:table-cell">{l.tech}</td>
                        <td className="align-top text-xs leading-5">{l.items.join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="w-full scroll-mt-20 px-4 py-20 sm:px-8 lg:px-12 2xl:px-20">
        <Reveal>
          <SectionHead eyebrow="User roles" title="Each person sees what they need, and nothing more.">
            Every role has its own demo account. Pick one to sign in with the credentials filled in.
          </SectionHead>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((r, i) => {
            const acct = DEMO_ACCOUNTS.find((a) => a.role === r.role)!;
            return (
              <Reveal key={r.role} delay={i * 70}>
                <div className="card spotlight flex h-full flex-col rounded-2xl p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-400/10 text-brand-300 ring-1 ring-brand-400/25">
                    <r.icon size={20} />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{ROLE_LABEL[r.role]}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{r.text}</p>
                  <div className="mt-5 rounded-md bg-white/[0.03] px-3 py-2 font-mono text-[11.5px] leading-5 text-[var(--text-secondary)] ring-1 ring-[var(--line)]">
                    <span className="block truncate">{acct.email}</span>
                    <span className="block text-[var(--text-muted)]">{acct.password}</span>
                  </div>
                  <button onClick={() => navigate(`/login?as=${r.role}`)} className="btn btn-ghost mt-3 justify-between">
                    Sign in as {ROLE_LABEL[r.role].toLowerCase()} <ArrowRight size={16} />
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-[var(--line)] bg-white/[0.02] py-20">
        <div className="grid w-full gap-10 px-4 sm:px-8 lg:px-12 2xl:px-20 lg:grid-cols-[1fr_2fr]">
          <Reveal>
            <SectionHead eyebrow="FAQ" title="Frequently asked questions" />
          </Reveal>
          <div className="divide-y divide-[var(--line)] rounded-2xl glass-strong">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[var(--text-primary)]">
                  {f.q}
                  <ChevronDown size={18} className="shrink-0 text-[var(--text-muted)] transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="w-full px-4 py-20 sm:px-8 lg:px-12 2xl:px-20">
        <Reveal>
          <div className="card flex flex-col gap-6 rounded-2xl p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">Explore the demo</p>
              <h2 className="font-serif mt-2 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">See a full timetable cycle in a few minutes.</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">A synthetic campus with 5 departments, 22 sections and 45 faculty. No real personal data is used.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button onClick={() => navigate('/login?as=admin')} className="btn btn-primary px-5 py-3">
                <ShieldCheck size={17} /> Administrator demo
              </button>
              <button onClick={() => navigate('/login?as=coordinator')} className="btn btn-ghost px-5 py-3">
                <Workflow size={17} /> Coordinator demo
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[var(--line)] bg-black/30 text-white/70">
        <div className="grid w-full gap-8 px-4 py-12 text-sm sm:px-8 lg:px-12 2xl:px-20 md:grid-cols-[2fr_1fr]">
          <div>
            <Logo size={32} light />
            <p className="mt-4 max-w-sm leading-6">Academic timetable and resource management. Clash-free generation, explainable scoring and an approval workflow for publication.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Product</p>
            <ul className="mt-3 space-y-2">
              {NAV_LINKS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={scrollTo(id)} className="hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="flex w-full flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:justify-between sm:px-8 lg:px-12 2xl:px-20">
            <p>© {new Date().getFullYear()} SchedulAI. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <Lock size={12} /> Role-based access · demo data only
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-serif mt-2 text-[1.85rem] font-semibold leading-tight text-[var(--text-primary)] sm:text-[2.5rem]">{title}</h2>
      {children && <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">{children}</p>}
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
const TIMES = ['9:00', '10:00', '11:00', '1:00', '2:00'];

function MiniWeek({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-1 ${compact ? 'grid-cols-5' : 'grid-cols-[38px_repeat(5,minmax(0,1fr))]'}`}>
      {!compact && <span />}
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
        <p key={d} className="pb-1 text-center text-[10px] font-semibold text-[var(--text-muted)]">
          {d}
        </p>
      ))}
      {WEEK.flatMap((row, r) => [
        ...(compact ? [] : [<span key={`t${r}`} className="pr-1 pt-1 text-right text-[9px] text-[var(--text-muted)]">{TIMES[r]}</span>]),
        ...row.map((c, k) =>
          c === 'LUNCH' ? (
            <div key={`${r}-${k}`} className={`rounded-[3px] bg-white/[0.06] ${compact ? 'h-3' : 'h-4'}`} />
          ) : c ? (
            <div
              key={`${r}-${k}`}
              className={`flex items-center rounded-[4px] border border-l-[3px] bg-white/[0.04] px-1.5 text-[10px] font-semibold text-[var(--text-primary)] ${compact ? 'h-7' : 'h-10'}`}
              style={{ borderColor: SUBJECT_COLORS[CODE_COLOR[c]] + '55', borderLeftColor: SUBJECT_COLORS[CODE_COLOR[c]], backgroundColor: SUBJECT_COLORS[CODE_COLOR[c]] + '12' }}
            >
              {c}
            </div>
          ) : (
            <div key={`${r}-${k}`} className={`rounded-[4px] border border-white/5 ${compact ? 'h-7' : 'h-10'}`} />
          )
        ),
      ])}
    </div>
  );
}

/** The published-timetable screen as layered 3D cards with a slow sway. */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] py-6 xl:max-w-[640px] 2xl:max-w-[720px]" style={{ perspective: '1400px' }} aria-hidden="true">
      <div className="preserve-3d relative animate-[hero-sway_14s_ease-in-out_infinite]" style={{ transform: 'rotateY(-12deg) rotateX(7deg)' }}>
        <div className="card overflow-hidden rounded-2xl shadow-[0_40px_80px_-30px_rgba(0,0,0,0.75)]">
          <div className="flex items-center gap-1.5 border-b border-[var(--line)] bg-white/[0.03] px-3 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="ml-3 flex-1 truncate rounded glass-strong px-2.5 py-0.5 text-[10.5px] text-[var(--text-muted)]">
              <Lock size={9} className="mr-1 inline" />
              schedulai.app/app/timetable
            </span>
          </div>
          <div className="flex">
            <div className="hidden w-28 shrink-0 border-r border-[var(--line)] p-2 sm:block">
              {['Overview', 'Data Import', 'Generate', 'Versions', 'Timetable', 'Requests'].map((n) => (
                <p key={n} className={`rounded px-2 py-1.5 text-[10px] font-medium ${n === 'Timetable' ? 'bg-brand-400/10 text-brand-300' : 'text-[var(--text-muted)]'}`}>
                  {n}
                </p>
              ))}
            </div>
            <div className="min-w-0 flex-1 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)]">Published · Odd semester v3</p>
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">CSE-5A · Shift 1</p>
                </div>
                <span className="chip shrink-0 border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                  <CheckCircle2 size={11} /> 0 clashes
                </span>
              </div>
              <MiniWeek />
            </div>
          </div>
        </div>

        <div className="absolute -bottom-8 -left-4 hidden sm:block lg:-left-10" style={{ transform: 'translateZ(110px)' }}>
          <div className="glass-strong w-56 animate-float-slow rounded-2xl p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-300">
              <Clock size={11} /> Next class
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Operating Systems</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">10:00 AM · Room A-201 · Dr. Priya Sharma</p>
          </div>
        </div>
        <div className="absolute -right-4 -top-6 hidden sm:block lg:-right-8" style={{ transform: 'translateZ(80px)' }}>
          <div className="glass-strong w-44 animate-float rounded-2xl px-3.5 py-2.5">
            <p className="text-[10px] text-[var(--text-muted)]">Hours placed</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
              355<span className="text-xs font-normal text-[var(--text-muted)]"> / 355</span>
            </p>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-full rounded-full bg-emerald-600" />
            </div>
          </div>
        </div>
        <div className="absolute -right-2 bottom-16 hidden lg:block" style={{ transform: 'translateZ(60px)' }}>
          <div className="glass-strong flex animate-float items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ animationDelay: '1.5s' }}>
            <FlaskConical size={15} className="text-rose-300" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">Labs in 2-hour blocks</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes hero-sway{0%,100%{transform:rotateY(-12deg) rotateX(7deg)}50%{transform:rotateY(-6deg) rotateX(4deg)}}`}</style>
    </div>
  );
}

const TOUR = [
  { id: 'import', label: 'Smart import', icon: UploadCloud },
  { id: 'timetable', label: 'Campus timetable', icon: CalendarRange },
  { id: 'faculty', label: 'Faculty view', icon: CalendarHeart },
] as const;

function ProductTour() {
  const [tab, setTab] = useState(0);
  return (
    <div className="mt-10">
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--line-strong)]" role="tablist">
        {TOUR.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === i ? 'border-brand-400 text-white' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>
      <div key={tab} className="card mt-6 min-h-[360px] rounded-2xl p-5 sm:p-7" style={{ animation: 'fade-up .35s both' }}>
        {tab === 0 && <TourImport />}
        {tab === 1 && <TourTimetable />}
        {tab === 2 && <TourFaculty />}
      </div>
    </div>
  );
}

function TourImport() {
  const files = [
    { n: 'Campus_Master_Data_2026.xlsx', s: '4 sheets → Faculty, Rooms, Sections, Subjects', c: '#16a34a' },
    { n: 'faculty list final (2).csv', s: '1 sheet → Faculty · 18 rows', c: '#1f6f8b' },
    { n: 'ECE timetable input - sem 5.xlsx', s: 'Subjects + Faculty + Sections from one table', c: '#16a34a' },
  ];
  const cols = [
    ['Teacher Name', 'Faculty › name'],
    ['Mail ID', 'Faculty › email'],
    ['Dept.', 'Department'],
    ['Status', 'Faculty › available'],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-3">
        <div className="rounded-lg border-2 border-dashed border-[var(--line-strong)] p-6 text-center">
          <UploadCloud className="mx-auto text-brand-300" size={26} />
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Drop files here</p>
          <p className="text-xs text-[var(--text-muted)]">.xlsx .xls .csv .ods .json</p>
        </div>
        {files.map((f) => (
          <div key={f.n} className="flex items-center gap-3 rounded-md border border-[var(--line)] p-3">
            <span className="flex h-10 w-9 shrink-0 items-center justify-center rounded text-[9px] font-black text-white" style={{ background: f.c }}>
              {f.n.split('.').pop()?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{f.n}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{f.s}</p>
            </div>
            <CheckCircle2 size={16} className="ml-auto shrink-0 text-emerald-300" />
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-white/[0.03] p-5 ring-1 ring-[var(--line)]">
        <p className="text-xs font-semibold text-[var(--text-muted)]">Detected as Faculty · 96% confidence</p>
        <div className="mt-4 space-y-2">
          {cols.map(([a, b]) => (
            <div key={a} className="flex items-center gap-3 rounded-2xl glass-strong px-3 py-2.5 text-sm">
              <code className="w-28 truncate font-mono text-[13px] text-[var(--text-secondary)]">{a}</code>
              <ArrowRight size={14} className="text-[var(--text-muted)]" />
              <span className="font-medium text-[var(--text-primary)]">{b}</span>
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
            <div key={l} className="rounded-2xl glass-strong p-2">
              <p className="text-xl font-semibold tabular-nums text-[var(--text-primary)]">{v}</p>
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
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['355 h', 'all placed'],
            ['22', 'sections'],
            ['45', 'faculty'],
            ['9 ms', 'to solve'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-md border border-[var(--line)] p-4">
              <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{v}</p>
              <p className="text-xs text-[var(--text-muted)]">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-md border border-[var(--line)] p-4">
          <MiniWeek compact />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg bg-white/[0.03] p-4 ring-1 ring-[var(--line)]">
        <p className="mb-3 text-xs font-semibold text-[var(--text-muted)]">All sections · Monday to Friday</p>
        <div className="space-y-1.5 overflow-x-auto">
          {rows.map((r, ri) => (
            <div key={r} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] font-semibold text-[var(--text-primary)]">{r}</span>
              <div className="flex gap-[3px]">
                {Array.from({ length: 30 }).map((_, i) => {
                  const on = (i * 7 + ri * 3) % 5 !== 0 && i % 6 !== 5;
                  return <span key={i} className="h-4 w-3 rounded-[2px] sm:w-3.5" style={{ background: on ? SUBJECT_COLORS[(i + ri) % 6] : 'rgba(255,255,255,0.06)' }} />;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Excel · every section', 'PDF', 'Calendar (.ics)', 'CSV'].map((d) => (
            <span key={d} className="chip bg-white/[0.04]">
              <FileCheck2 size={11} /> {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TourFaculty() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-3">
        <div className="rounded-md border border-[var(--line)] p-5">
          <p className="text-xs text-[var(--text-muted)]">Good morning</p>
          <p className="font-serif mt-0.5 text-2xl font-semibold text-[var(--text-primary)]">Dr. Priya Sharma</p>
          <p className="text-xs text-[var(--text-secondary)]">Associate Professor · Computer Science</p>
        </div>
        {[
          ['9:00 AM', 'Data Structures', 'CSE-3A · A-102'],
          ['11:00 AM', 'Data Structures Lab', 'CSE-3C · B-LAB-1'],
          ['2:00 PM', 'Discrete Mathematics', 'CSE-3B · C-201'],
        ].map(([t, s, d], i) => (
          <div key={t} className="flex items-center gap-3 rounded-md border border-[var(--line)] p-3">
            <span className="h-9 w-1 rounded-full" style={{ background: SUBJECT_COLORS[i * 2] }} />
            <div>
              <p className="text-xs text-[var(--text-muted)]">{t}</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
                {s} {s.endsWith('Lab') && <FlaskConical size={12} className="text-[var(--text-muted)]" />}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">{d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-white/[0.03] p-5 ring-1 ring-[var(--line)]">
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              [Clock, '13 h', 'this week'],
              [GraduationCap, '3', 'sections'],
              [DoorOpen, '5', 'rooms'],
            ] as const
          ).map(([Icon, v, l]) => (
            <div key={l} className="rounded-2xl glass-strong p-3">
              <Icon size={15} className="text-[var(--text-muted)]" />
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-primary)]">{v}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl glass-strong p-3">
          <MiniWeek compact />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <CalendarPlus size={14} className="text-brand-300" /> Add my week to Google, Outlook or Apple Calendar
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
    const t = setInterval(() => setActive((a) => (a + 1) % PAIRS.length), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="card rounded-2xl p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Column matching</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Your headers, mapped to SchedulAI fields</p>
        </div>
        <CalendarCheck2 size={20} className="text-brand-300" />
      </div>
      <div className="mt-5 space-y-2">
        {PAIRS.map(([from, to], i) => (
          <div key={from} className={`flex items-center gap-3 rounded-md border px-4 py-2.5 transition-colors duration-300 ${i === active ? 'border-brand-400/50 bg-brand-400/10' : 'border-[var(--line)] bg-white/[0.04]'}`}>
            <code className="w-28 truncate font-mono text-[13px] text-[var(--text-secondary)]">{from}</code>
            <ArrowRight size={14} className={i === active ? 'text-brand-300' : 'text-[var(--text-muted)]'} />
            <span className="text-sm font-medium text-[var(--text-primary)]">{to}</span>
            {i <= active && <CheckCircle2 size={15} className="ml-auto text-emerald-300" />}
          </div>
        ))}
      </div>
    </div>
  );
}
