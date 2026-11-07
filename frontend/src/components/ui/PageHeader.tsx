import type { ReactNode } from 'react';

export default function PageHeader({ eyebrow, title, text, actions }: { eyebrow: string; title: ReactNode; text?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="flex animate-fade-up flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-2 text-[1.75rem] font-bold leading-tight text-white sm:text-4xl">{title}</h1>
        {text && <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
