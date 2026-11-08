import type { ReactNode } from 'react';

export default function PageHeader({ eyebrow, title, text, actions }: { eyebrow: string; title: ReactNode; text?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="flex animate-fade-up flex-col justify-between gap-5 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-serif mt-1.5 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)] sm:text-[2.1rem]">{title}</h1>
        {text && <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
