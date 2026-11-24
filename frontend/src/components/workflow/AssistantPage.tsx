import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  ArrowDown, ArrowUp, CalendarDays, Check, Clock3, Copy, DoorOpen, Gauge, Lock, MessageSquareText, RefreshCw,
  RotateCcw, Sparkles, UserRound, type LucideIcon,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import AssistantMarkdown from './AssistantMarkdown';
import { api } from '../../lib/api';
import { useSession } from '../../lib/auth';

type Message = { id: number; role: 'assistant' | 'user'; text: string; time: string; intent?: string; failed?: boolean; question?: string };
type AskResponse = { answer?: unknown; intent?: unknown };

const HISTORY_TURNS = 6;
const MAX_CHARS = 500;
const UNAVAILABLE = 'I couldn’t reach the timetable service just now. Check your connection and try again.';
const THINKING = ['Reading the published timetable…', 'Matching days, rooms and people…', 'Writing your answer…'];

/** Follow-ups that make sense after each kind of answer. */
const FOLLOW_UPS: Record<string, string[]> = {
  day: ['What about tomorrow?', 'Am I free that afternoon?'],
  subject: ['Who teaches it?', 'Which rooms is it held in?'],
  faculty: ['What about Friday?', 'How many hours is that per week?'],
  room: ['Is it free after lunch?', 'What about Wednesday?'],
  free: ['What about 3pm?', 'Any free labs instead?'],
  workload: ['Which rooms are used the most?', 'Which day is the busiest?'],
  all: ['What do I have today?', 'When am I free this week?'],
};

type Prompt = { icon: LucideIcon; title: string; text: string; tint: string };
const PROMPTS_BY_ROLE: Record<'staff' | 'personal', Prompt[]> = {
  staff: [
    { icon: DoorOpen, title: 'Free rooms', text: 'Which labs are free on Friday at 2pm?', tint: 'from-amber-400/20 text-amber-200' },
    { icon: Gauge, title: 'Workload', text: 'Who is overloaded and who has spare capacity?', tint: 'from-emerald-400/20 text-emerald-200' },
    { icon: UserRound, title: 'Who teaches', text: 'Who teaches DBMS?', tint: 'from-violet-400/20 text-violet-200' },
    { icon: CalendarDays, title: 'A section’s day', text: 'Show CSE-5A on Tuesday', tint: 'from-sky-400/20 text-sky-200' },
  ],
  personal: [
    { icon: CalendarDays, title: 'Today', text: 'What do I have today?', tint: 'from-sky-400/20 text-sky-200' },
    { icon: Clock3, title: 'Free periods', text: 'When am I free on Wednesday?', tint: 'from-violet-400/20 text-violet-200' },
    { icon: DoorOpen, title: 'Free rooms', text: 'Which rooms are free on Friday at 2pm?', tint: 'from-amber-400/20 text-amber-200' },
    { icon: Gauge, title: 'My week', text: 'How many hours do I have this week?', tint: 'from-emerald-400/20 text-emerald-200' },
  ],
};

const CAPABILITIES = [
  'Classes on any day, today or tomorrow',
  'Who teaches a subject (codes and short forms work)',
  'Free rooms, labs and free periods',
  'Teaching hours and room usage',
  'Follow-ups like “what about Thursday?”',
];

function clockTime() {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

/** The conversation survives page switches for this browser session, per signed-in user. */
function storageKey(email?: string) {
  return `schedulai.assistant.chat.${email ?? 'anon'}`;
}
function loadChat(email?: string): Message[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(email)) ?? '[]');
    return Array.isArray(saved) ? saved.filter((m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant')).slice(-40) : [];
  } catch {
    return [];
  }
}

function Orb({ size = 'md', children }: { size?: 'md' | 'lg'; children?: ReactNode }) {
  const box = size === 'lg' ? 'h-16 w-16 rounded-3xl' : 'h-9 w-9 rounded-xl';
  return <div className={`ai-orb grid shrink-0 place-items-center text-sky-50 ${box}`}>{children ?? <Sparkles size={size === 'lg' ? 26 : 16} />}</div>;
}

function Thinking() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, THINKING.length - 1)), 1400);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="flex animate-fade-up gap-3 sm:gap-4" role="status" aria-label="Assistant is responding">
      <Orb />
      <div className="flex items-center gap-3 rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.045] px-4 py-3 text-sm text-[var(--text-muted)]">
        <span className="flex gap-1" aria-hidden="true">
          <span className="ai-dot" /><span className="ai-dot" style={{ animationDelay: '0.15s' }} /><span className="ai-dot" style={{ animationDelay: '0.3s' }} />
        </span>
        <span key={step} className="animate-fade-up">{THINKING[step]}</span>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const session = useSession();
  const email = session?.user.email;
  const [messages, setMessages] = useState<Message[]>(() => loadChat(email));
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(messages.reduce((max, m) => Math.max(max, m.id), 0) + 1);

  const role = session?.user.role ?? 'student';
  const name = session?.user.name.replace(/^(dr|prof)\.?\s+/i, '').split(' ')[0] ?? 'there';
  const prompts = PROMPTS_BY_ROLE[role === 'admin' || role === 'coordinator' ? 'staff' : 'personal'];
  const scope = role === 'student'
    ? `Section ${session?.user.section ?? ''}`.trim()
    : role === 'faculty' ? 'Your classes only' : 'Whole campus';
  const empty = messages.length === 0;
  const last = messages.at(-1);
  const followUps = !pending && last?.role === 'assistant' && !last.failed && last.intent ? FOLLOW_UPS[last.intent] ?? [] : [];

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(email), JSON.stringify(messages.slice(-40)));
    } catch {
      // Storage can be full or blocked; the chat still works without it.
    }
  }, [messages, email]);

  // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect
  // must return nothing or a cleanup function, otherwise React crashes the page.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pending]);

  // Grow the composer with its content, up to a few lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  function onScroll() {
    const el = scrollRef.current;
    if (el) setAwayFromBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 160);
  }

  async function ask(raw: string, { retryOf }: { retryOf?: number } = {}) {
    const question = raw.trim().slice(0, MAX_CHARS);
    if (!question || pending) return;

    // On retry the failed reply is removed and the question it answered is already the last turn.
    const base = retryOf ? messages.filter((m) => m.id !== retryOf) : messages;
    const prior = base.filter((m) => !m.failed);
    const history = (retryOf ? prior.slice(0, -1) : prior)
      .slice(-HISTORY_TURNS)
      .map(({ role: r, text }) => ({ role: r, text }));

    if (retryOf) setMessages(base);
    else {
      setMessages((current) => [...current, { id: nextId.current++, role: 'user', text: question, time: clockTime() }]);
      setDraft('');
    }
    setPending(true);

    try {
      const result = await api.post<AskResponse | null>('/assistant/ask', { question, history });
      const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
      setMessages((current) => [...current, answer
        ? { id: nextId.current++, role: 'assistant', text: answer, time: clockTime(), intent: typeof result?.intent === 'string' ? result.intent : undefined }
        : { id: nextId.current++, role: 'assistant', text: UNAVAILABLE, time: clockTime(), failed: true, question }]);
    } catch (error) {
      const reason = error instanceof Error && error.message && error.message !== 'Something went wrong' ? error.message : UNAVAILABLE;
      setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', text: reason, time: clockTime(), failed: true, question }]);
    } finally {
      setPending(false);
      window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    }
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.stopPropagation();
      void ask(draft);
    }
  }

  async function copyMessage(message: Message) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(message.id);
      window.setTimeout(() => setCopied((current) => (current === message.id ? null : current)), 1600);
    } catch {
      // Clipboard access can be unavailable in embedded or insecure contexts.
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-6 sm:space-y-6 sm:pb-8">
      <PageHeader
        eyebrow="SchedulAI intelligence"
        title="Timetable Assistant"
        text={<span className="hidden sm:inline">Ask in your own words. Answers come from the latest published timetable and only include what your role is allowed to see.</span>}
        actions={
          <button
            type="button"
            onClick={() => { setMessages([]); setDraft(''); inputRef.current?.focus(); }}
            disabled={pending || empty}
            className="btn btn-secondary"
          >
            <RotateCcw size={15} /> New chat
          </button>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <section className="ai-panel glass relative flex h-[calc(100dvh-210px)] min-h-[520px] flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/30 sm:h-[min(740px,calc(100dvh-230px))]">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-indigo-500/[0.14] blur-[90px]" />
          <div className="pointer-events-none absolute -left-24 bottom-16 h-64 w-64 rounded-full bg-cyan-500/[0.09] blur-[90px]" />

          <header className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative">
                <Orb />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">SchedulAI Assistant</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                  <Lock size={10} className="text-emerald-300/80" /> {scope}
                </p>
              </div>
            </div>
            {!empty && (
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <MessageSquareText size={12} /> {messages.filter((m) => m.role === 'user').length}
              </span>
            )}
          </header>

          <div ref={scrollRef} onScroll={onScroll} className="relative flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:gap-6 sm:px-7 sm:py-7" aria-live="polite" aria-label="Conversation">
            {empty && (
              <div className="m-auto flex w-full max-w-xl animate-fade-up flex-col items-center py-4 text-center">
                <Orb size="lg" />
                <h2 className="font-serif mt-5 text-2xl font-semibold text-[var(--text-primary)] sm:text-[1.7rem]">How can I help, {name}?</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">Ask about classes, teachers, free rooms or workload. I only use the published timetable.</p>
                <div className="mt-6 grid w-full gap-2.5 sm:grid-cols-2">
                  {prompts.map(({ icon: Icon, title, text, tint }) => (
                    <button key={title} type="button" onClick={() => void ask(text)} className="group flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.06]">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br to-transparent ${tint}`}><Icon size={16} /></span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-[var(--text-primary)]">{title}</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">{text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`flex animate-fade-up gap-3 sm:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {message.role === 'assistant'
                  ? <Orb />
                  : <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-slate-300 ring-1 ring-white/[0.08]"><UserRound size={16} /></div>}
                <div className={`group min-w-0 max-w-[88%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6 sm:px-5 ${
                    message.role === 'user'
                      ? 'rounded-tr-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-950/30'
                      : message.failed
                        ? 'rounded-tl-md border border-amber-300/20 bg-amber-300/[0.06] text-amber-50'
                        : 'rounded-tl-md border border-white/[0.07] bg-white/[0.045] text-[var(--text-primary)] shadow-lg shadow-black/10'}`}
                  >
                    {message.role === 'assistant' ? <AssistantMarkdown text={message.text} /> : <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                    {message.failed && message.question && (
                      <button type="button" onClick={() => void ask(message.question!, { retryOf: message.id })} disabled={pending} className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-200/20 bg-amber-200/10 px-2.5 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-200/20 disabled:opacity-50">
                        <RefreshCw size={12} /> Retry
                      </button>
                    )}
                  </div>
                  <div className={`mt-1.5 flex items-center gap-2 text-[10px] text-[var(--text-muted)] ${message.role === 'user' ? 'justify-end' : ''}`}>
                    <span>{message.role === 'assistant' ? 'SchedulAI' : 'You'} · {message.time}</span>
                    {message.role === 'assistant' && !message.failed && (
                      <button type="button" onClick={() => void copyMessage(message)} className="inline-flex items-center gap-1 transition hover:text-white focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Copy assistant response">
                        {copied === message.id ? <Check size={11} /> : <Copy size={11} />}
                        {copied === message.id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {pending && <Thinking />}
            <div ref={endRef} />
          </div>

          {awayFromBottom && !empty && (
            <button type="button" onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })} className="absolute bottom-36 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/90 px-3 py-1.5 text-[11px] text-slate-200 shadow-lg backdrop-blur transition hover:bg-slate-800" aria-label="Jump to latest message">
              <ArrowDown size={12} /> Latest
            </button>
          )}

          <div className="relative border-t border-white/[0.07] bg-black/[0.12] p-3 sm:p-5">
            {followUps.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
                {followUps.map((text) => (
                  <button key={text} type="button" onClick={() => void ask(text)} className="shrink-0 animate-fade-up rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition hover:-translate-y-px hover:border-sky-300/30 hover:bg-sky-300/[0.07] hover:text-sky-100">
                    {text}
                  </button>
                ))}
              </div>
            )}
            <div role="group" aria-label="Send a timetable question" className="ai-composer flex items-end gap-2 rounded-2xl border border-white/[0.1] bg-slate-950/60 p-2 shadow-inner shadow-black/20 transition focus-within:border-sky-300/35">
              <label className="sr-only" htmlFor="assistant-question">Ask about the published timetable</label>
              <textarea
                id="assistant-question"
                ref={inputRef}
                rows={1}
                value={draft}
                maxLength={MAX_CHARS}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKey}
                placeholder={pending ? 'Answering… you can type your next question' : `Ask a question, ${name}…`}
                className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button type="button" onClick={() => void ask(draft)} disabled={!draft.trim() || pending} aria-label="Send question" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-indigo-950/40 transition hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100">
                <ArrowUp size={18} />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] text-[var(--text-muted)]">
              <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span>
              <span className="sm:hidden">Answers use the published timetable</span>
              {draft.length > MAX_CHARS - 100 && <span className={draft.length >= MAX_CHARS ? 'text-amber-300' : ''}>{draft.length}/{MAX_CHARS}</span>}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="glass rounded-3xl border border-white/[0.08] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200/80">What I can do</p>
            <ul className="mt-3 space-y-2.5">
              {CAPABILITIES.map((item) => (
                <li key={item} className="flex gap-2.5 text-xs leading-5 text-[var(--text-secondary)]">
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-300" /> {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-3xl border border-sky-300/[0.14] bg-gradient-to-br from-sky-400/[0.08] via-indigo-500/[0.06] to-violet-500/[0.09] p-5">
            <div className="flex items-center gap-2 text-sky-100"><Lock size={15} /><h2 className="text-sm font-semibold">Private and grounded</h2></div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Each answer is written only from the timetable rows your role may see: students their section, faculty their own classes.</p>
            <p className="mt-3 border-t border-white/[0.08] pt-3 text-[10px] leading-4 text-[var(--text-muted)]">AI can make mistakes. Check the published timetable before acting on anything important.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
