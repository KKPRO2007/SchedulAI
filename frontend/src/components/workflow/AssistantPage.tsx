import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUpRight, Bot, CalendarDays, Check, Clock3, LoaderCircle, RotateCcw, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import { api } from '../../lib/api';
import { useSession } from '../../lib/auth';

type Message = { id: number; role: 'assistant' | 'user'; text: string; time: string; provider?: string };
type AskResponse = { answer?: unknown; provider?: unknown };

const PROVIDER_LABELS: Record<string, string> = { groq: 'Groq', gemini: 'Gemini', 'built-in': 'Built-in lookup' };
const HISTORY_TURNS = 6;
const UNAVAILABLE = 'I couldn’t reach the timetable service just now. Check your connection and try again in a moment.';

const PROMPTS = [
  { icon: CalendarDays, title: 'My Monday', text: 'Show me my classes on Monday', tint: 'text-sky-300' },
  { icon: Clock3, title: 'Free periods', text: 'When am I free on Wednesday?', tint: 'text-violet-300' },
  { icon: Sparkles, title: 'Free rooms', text: 'Which rooms are free on Friday at 2pm?', tint: 'text-amber-300' },
  { icon: Bot, title: 'Workload', text: 'How many hours are taught each week?', tint: 'text-emerald-300' },
];

const initialMessage: Message = {
  id: 1,
  role: 'assistant',
  text: 'Hi! Ask me anything about the published timetable: your classes on a day, who teaches a subject, free rooms or free periods, or teaching workload. Follow-up questions like “what about Thursday?” work too.',
  time: 'Just now',
};

function clockTime() {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
}

export default function AssistantPage() {
  const session = useSession();
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);
  const name = session?.user.name.replace(/^(dr|prof)\.?\s+/i, '').split(' ')[0] ?? 'there';

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages, pending]);

  async function ask(raw: string) {
    const question = raw.trim();
    if (!question || pending) return;

    const history = messages
      .filter((message) => message.id !== initialMessage.id)
      .slice(-HISTORY_TURNS)
      .map(({ role, text }) => ({ role, text }));
    const userMessage: Message = { id: nextId.current++, role: 'user', text: question, time: clockTime() };
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setPending(true);

    try {
      const result = await api.post<AskResponse | null>('/assistant/ask', { question, history });
      const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
      const provider = typeof result?.provider === 'string' ? result.provider : undefined;
      setMessages((current) => [...current, {
        id: nextId.current++,
        role: 'assistant',
        text: answer || UNAVAILABLE,
        time: clockTime(),
        provider: answer ? provider : undefined,
      }]);
    } catch {
      setMessages((current) => [...current, {
        id: nextId.current++,
        role: 'assistant',
        text: UNAVAILABLE,
        time: clockTime(),
      }]);
    } finally {
      setPending(false);
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
      window.setTimeout(() => setCopied((current) => current === message.id ? null : current), 1600);
    } catch {
      // Clipboard access can be unavailable in embedded or insecure contexts.
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <PageHeader
        eyebrow="SchedulAI intelligence"
        title="Your timetable, in a conversation"
        text="Find classes, rooms, and teaching schedules with a quick question. Answers come from the latest published timetable."
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

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
        <section className="glass relative flex min-h-[630px] flex-col overflow-hidden rounded-3xl border border-white/[0.09] shadow-2xl shadow-black/20">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-indigo-500/[0.12] blur-[90px]" />
          <div className="pointer-events-none absolute -left-24 bottom-16 h-64 w-64 rounded-full bg-cyan-500/[0.08] blur-[90px]" />

          <header className="relative flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-400/20 via-indigo-400/20 to-violet-500/20 ring-1 ring-white/10">
                <Bot size={21} className="text-sky-200" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </div>
              <div>
                <p className="font-semibold tracking-tight text-[var(--text-primary)]">SchedulAI Assistant</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-sky-300" /> Ask about the published timetable</p>
              </div>
            </div>
            <span className="rounded-full border border-indigo-300/20 bg-indigo-300/[0.08] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-indigo-200">BETA</span>
          </header>

          <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8" aria-live="polite" aria-label="Conversation">
            {messages.map((message) => (
              <article key={message.id} className={`flex gap-3 sm:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-white/[0.08] ${message.role === 'assistant' ? 'bg-gradient-to-br from-sky-400/20 to-indigo-500/20 text-sky-200' : 'bg-white/[0.07] text-slate-300'}`}>
                  {message.role === 'assistant' ? <Sparkles size={16} /> : <UserRound size={16} />}
                </div>
                <div className={`group min-w-0 max-w-[88%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6 sm:px-5 ${message.role === 'assistant' ? 'rounded-tl-md border border-white/[0.07] bg-white/[0.045] text-[var(--text-primary)]' : 'rounded-tr-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-indigo-950/25'}`}>
                    <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  </div>
                  <div className={`mt-1.5 flex items-center gap-2 text-[10px] text-[var(--text-muted)] ${message.role === 'user' ? 'justify-end' : ''}`}>
                    <span>{message.role === 'assistant' ? 'SchedulAI' : 'You'} · {message.time}</span>
                    {message.provider && PROVIDER_LABELS[message.provider] && (
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-px text-[9px] tracking-wide" title="Which engine wrote this answer">{PROVIDER_LABELS[message.provider]}</span>
                    )}
                    {message.role === 'assistant' && message.id !== initialMessage.id && (
                      <button type="button" onClick={() => void copyMessage(message)} className="inline-flex items-center gap-1 opacity-0 transition hover:text-white group-hover:opacity-100 focus:opacity-100" aria-label="Copy assistant response">
                        {copied === message.id ? <Check size={11} /> : <ArrowUpRight size={11} />}
                        {copied === message.id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {pending && (
              <div className="flex gap-3 sm:gap-4" role="status" aria-label="Assistant is responding">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-400/10 text-indigo-200 ring-1 ring-white/[0.08]"><Sparkles size={16} /></div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.045] px-4 py-3 text-sm text-[var(--text-muted)]">
                  <LoaderCircle size={15} className="animate-spin text-sky-300" /> Checking the published timetable…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="relative border-t border-white/[0.07] bg-black/[0.08] p-4 sm:p-5">
            {messages.length === 1 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {['What classes do I have today?', 'Who teaches Operating Systems?', 'Show me the whole published timetable'].map((text) => (
                  <button key={text} type="button" onClick={() => void ask(text)} disabled={pending} className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] text-[var(--text-secondary)] transition hover:border-sky-300/30 hover:bg-sky-300/[0.07] hover:text-sky-100 disabled:opacity-50">
                    {text}
                  </button>
                ))}
              </div>
            )}
            <div role="group" aria-label="Send a timetable question" className="flex items-end gap-2 rounded-2xl border border-white/[0.1] bg-slate-950/55 p-2 shadow-inner shadow-black/20 transition focus-within:border-sky-300/30 focus-within:ring-2 focus-within:ring-sky-400/[0.08]">
              <label className="sr-only" htmlFor="assistant-question">Ask about the published timetable</label>
              <textarea
                id="assistant-question"
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKey}
                placeholder={`Ask a question, ${name}…`}
                className="max-h-32 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                disabled={pending}
              />
              <button type="button" onClick={() => void ask(draft)} disabled={!draft.trim() || pending} aria-label="Send question" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">
                {pending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
            <p className="mt-2.5 text-center text-[10px] text-[var(--text-muted)]">Enter to send · Shift + Enter for a new line · Answers use published timetable data</p>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="glass overflow-hidden rounded-3xl border border-white/[0.08] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-200/80">Try asking</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">Make it a little easier</h2>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-400/[0.1] text-sky-200"><ArrowDown size={16} /></div>
            </div>
            <div className="mt-4 space-y-2">
              {PROMPTS.map(({ icon: Icon, title, text, tint }) => (
                <button key={title} type="button" onClick={() => void ask(text)} disabled={pending} className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.055] disabled:opacity-50">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.045]"><Icon size={16} className={tint} /></div>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-[var(--text-primary)]">{title}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--text-muted)]">{text}</span></span>
                  <ArrowUpRight size={14} className="text-slate-600 transition group-hover:text-sky-200" />
                </button>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-sky-300/[0.14] bg-gradient-to-br from-sky-400/[0.08] via-indigo-500/[0.06] to-violet-500/[0.09] p-5">
            <div className="flex items-center gap-2 text-sky-100"><ShieldCheck size={16} /><h2 className="text-sm font-semibold">Grounded in your timetable</h2></div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Answers are built from the latest published schedule. Students see their own section and faculty see their own sessions.</p>
            <div className="mt-4 flex items-center gap-2 border-t border-white/[0.08] pt-3 text-[10px] text-[var(--text-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Private, role-aware access</div>
          </section>

          <p className="px-2 text-[10px] leading-4 text-[var(--text-muted)]">An AI model phrases each answer from the timetable records it is given. It can make mistakes, so check the timetable before acting on anything important.</p>
        </aside>
      </div>
    </div>
  );
}
