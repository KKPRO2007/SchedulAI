import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  ArrowUp, Bot, CalendarDays, Check, Clock3, Copy, Database, DoorOpen, Gauge, LoaderCircle, RotateCcw,
  ShieldCheck, Sparkles, UserRound, Zap, type LucideIcon,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import AssistantMarkdown from './AssistantMarkdown';
import { api } from '../../lib/api';
import { useSession } from '../../lib/auth';

type Message = { id: number; role: 'assistant' | 'user'; text: string; time: string; provider?: string; intent?: string };
type AskResponse = { answer?: unknown; provider?: unknown; intent?: unknown };

const PROVIDERS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  groq: { label: 'Groq', icon: Zap, tone: 'border-orange-300/20 bg-orange-300/[0.08] text-orange-200' },
  gemini: { label: 'Gemini', icon: Sparkles, tone: 'border-sky-300/20 bg-sky-300/[0.08] text-sky-200' },
  'built-in': { label: 'Built-in lookup', icon: Database, tone: 'border-white/10 bg-white/[0.05] text-slate-300' },
};
const HISTORY_TURNS = 6;
const UNAVAILABLE = 'I couldn’t reach the timetable service just now. Check your connection and try again in a moment.';
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

const PROMPTS_BY_ROLE: Record<string, { icon: LucideIcon; title: string; text: string; tint: string }[]> = {
  staff: [
    { icon: DoorOpen, title: 'Free rooms', text: 'Which labs are free on Friday at 2pm?', tint: 'text-amber-300' },
    { icon: Gauge, title: 'Workload', text: 'Who is overloaded and who has spare capacity?', tint: 'text-emerald-300' },
    { icon: UserRound, title: 'Who teaches', text: 'Who teaches DBMS?', tint: 'text-violet-300' },
    { icon: CalendarDays, title: 'A section’s day', text: 'Show CSE-5A on Tuesday', tint: 'text-sky-300' },
  ],
  personal: [
    { icon: CalendarDays, title: 'Today', text: 'What do I have today?', tint: 'text-sky-300' },
    { icon: Clock3, title: 'Free periods', text: 'When am I free on Wednesday?', tint: 'text-violet-300' },
    { icon: DoorOpen, title: 'Free rooms', text: 'Which rooms are free on Friday at 2pm?', tint: 'text-amber-300' },
    { icon: Gauge, title: 'My week', text: 'How many hours do I have this week?', tint: 'text-emerald-300' },
  ],
};

const initialMessage: Message = {
  id: 1,
  role: 'assistant',
  text: 'Hi! Ask me anything about the published timetable: your classes on a day, who teaches a subject, free rooms or free periods, or teaching workload.\n\nFollow-ups like **“what about Thursday?”** work too.',
  time: 'Just now',
};

function clockTime() {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

function ProviderBadge({ provider }: { provider?: string }) {
  const meta = provider ? PROVIDERS[provider] : undefined;
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] font-medium tracking-wide ${meta.tone}`} title="Which engine wrote this answer">
      <Icon size={9} /> {meta.label}
    </span>
  );
}

function Thinking() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, THINKING.length - 1)), 1400);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="flex animate-fade-up gap-3 sm:gap-4" role="status" aria-label="Assistant is responding">
      <div className="ai-orb grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sky-100"><Sparkles size={16} /></div>
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
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(2);
  const role = session?.user.role ?? 'student';
  const name = session?.user.name.replace(/^(dr|prof)\.?\s+/i, '').split(' ')[0] ?? 'there';
  const prompts = PROMPTS_BY_ROLE[role === 'admin' || role === 'coordinator' ? 'staff' : 'personal'];
  const scope = role === 'student'
    ? `Section ${session?.user.section ?? ''}`.trim()
    : role === 'faculty' ? 'Your sessions' : 'Whole campus';
  const last = messages.at(-1);
  const followUps = !pending && last?.role === 'assistant' && last.intent ? FOLLOW_UPS[last.intent] ?? [] : [];

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

  async function ask(raw: string) {
    const question = raw.trim();
    if (!question || pending) return;

    const history = messages
      .filter((message) => message.id !== initialMessage.id)
      .slice(-HISTORY_TURNS)
      .map(({ role: r, text }) => ({ role: r, text }));
    const userMessage: Message = { id: nextId.current++, role: 'user', text: question, time: clockTime() };
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setPending(true);

    try {
      const result = await api.post<AskResponse | null>('/assistant/ask', { question, history });
      const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
      setMessages((current) => [...current, {
        id: nextId.current++,
        role: 'assistant',
        text: answer || UNAVAILABLE,
        time: clockTime(),
        provider: answer && typeof result?.provider === 'string' ? result.provider : undefined,
        intent: answer && typeof result?.intent === 'string' ? result.intent : undefined,
      }]);
    } catch {
      setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', text: UNAVAILABLE, time: clockTime() }]);
    } finally {
      setPending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
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
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        eyebrow="SchedulAI intelligence"
        title="Your timetable, in a conversation"
        text="Ask in your own words. Answers come from the latest published timetable, and only show what your role is allowed to see."
        actions={
          <button
            type="button"
            onClick={() => { setMessages([initialMessage]); setDraft(''); }}
            disabled={pending || messages.length === 1}
            className="btn btn-secondary"
          >
            <RotateCcw size={15} /> New chat
          </button>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="ai-panel glass relative flex h-[min(720px,calc(100vh-220px))] min-h-[560px] flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/30">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-indigo-500/[0.14] blur-[90px]" />
          <div className="pointer-events-none absolute -left-24 bottom-16 h-64 w-64 rounded-full bg-cyan-500/[0.09] blur-[90px]" />

          <header className="relative flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="ai-orb relative grid h-11 w-11 place-items-center rounded-2xl">
                <Bot size={21} className="text-sky-100" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </div>
              <div>
                <p className="font-semibold tracking-tight text-[var(--text-primary)]">SchedulAI Assistant</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Online · {scope}
                </p>
              </div>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full border border-indigo-300/20 bg-indigo-300/[0.08] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-indigo-200 sm:inline-flex">
              <Zap size={11} /> AI
            </span>
          </header>

          <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8" aria-live="polite" aria-label="Conversation">
            {messages.map((message) => (
              <article key={message.id} className={`flex animate-fade-up gap-3 sm:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${message.role === 'assistant' ? 'ai-orb text-sky-100' : 'bg-white/[0.07] text-slate-300 ring-1 ring-white/[0.08]'}`}>
                  {message.role === 'assistant' ? <Sparkles size={16} /> : <UserRound size={16} />}
                </div>
                <div className={`group min-w-0 max-w-[88%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6 sm:px-5 ${message.role === 'assistant' ? 'rounded-tl-md border border-white/[0.07] bg-white/[0.045] text-[var(--text-primary)] shadow-lg shadow-black/10' : 'rounded-tr-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-950/30'}`}>
                    {message.role === 'assistant' ? <AssistantMarkdown text={message.text} /> : <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                  </div>
                  <div className={`mt-1.5 flex items-center gap-2 text-[10px] text-[var(--text-muted)] ${message.role === 'user' ? 'justify-end' : ''}`}>
                    <span>{message.role === 'assistant' ? 'SchedulAI' : 'You'} · {message.time}</span>
                    <ProviderBadge provider={message.provider} />
                    {message.role === 'assistant' && message.id !== initialMessage.id && (
                      <button type="button" onClick={() => void copyMessage(message)} className="inline-flex items-center gap-1 opacity-0 transition hover:text-white group-hover:opacity-100 focus:opacity-100" aria-label="Copy assistant response">
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

          <div className="relative border-t border-white/[0.07] bg-black/[0.12] p-4 sm:p-5">
            {(messages.length === 1 || followUps.length > 0) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {(messages.length === 1 ? prompts.slice(0, 3).map((p) => p.text) : followUps).map((text) => (
                  <button key={text} type="button" onClick={() => void ask(text)} disabled={pending} className="animate-fade-up rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition hover:-translate-y-px hover:border-sky-300/30 hover:bg-sky-300/[0.07] hover:text-sky-100 disabled:opacity-50">
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
                maxLength={500}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKey}
                placeholder={`Ask a question, ${name}…`}
                className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                disabled={pending}
              />
              <button type="button" onClick={() => void ask(draft)} disabled={!draft.trim() || pending} aria-label="Send question" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-indigo-950/40 transition hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100">
                {pending ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUp size={18} />}
              </button>
            </div>
            <p className="mt-2.5 text-center text-[10px] text-[var(--text-muted)]">Enter to send · Shift + Enter for a new line · Answers use published timetable data</p>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="glass overflow-hidden rounded-3xl border border-white/[0.08] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200/80">Try asking</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Start with one of these</h2>
            <div className="mt-4 space-y-2">
              {prompts.map(({ icon: Icon, title, text, tint }) => (
                <button key={title} type="button" onClick={() => void ask(text)} disabled={pending} className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.055] disabled:opacity-50">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.045] transition group-hover:scale-110"><Icon size={16} className={tint} /></div>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[var(--text-primary)]">{title}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">{text}</span></span>
                  <ArrowUp size={14} className="rotate-45 text-slate-600 transition group-hover:text-sky-200" />
                </button>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-sky-300/[0.14] bg-gradient-to-br from-sky-400/[0.08] via-indigo-500/[0.06] to-violet-500/[0.09] p-5">
            <div className="flex items-center gap-2 text-sky-100"><ShieldCheck size={16} /><h2 className="text-sm font-semibold">Grounded in your timetable</h2></div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">A local ML model routes each question, the server picks only the timetable rows your role may see, and the AI writes the answer from those rows alone.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.08] pt-3 text-center text-[10px] text-[var(--text-muted)]">
              <span className="rounded-xl bg-white/[0.04] px-2 py-1.5"><Zap size={12} className="mx-auto mb-1 text-orange-200" />Groq</span>
              <span className="rounded-xl bg-white/[0.04] px-2 py-1.5"><Sparkles size={12} className="mx-auto mb-1 text-sky-200" />Gemini</span>
              <span className="rounded-xl bg-white/[0.04] px-2 py-1.5"><Database size={12} className="mx-auto mb-1 text-slate-300" />Lookup</span>
            </div>
          </section>

          <p className="px-2 text-[10px] leading-4 text-[var(--text-muted)]">AI can make mistakes. Check the published timetable before acting on anything important.</p>
        </aside>
      </div>
    </div>
  );
}
