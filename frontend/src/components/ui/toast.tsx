import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

import { toastBus, type Toast } from '../../lib/toast';

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setItems((list) => [...list, t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 4200);
    };
    toastBus.addEventListener('toast', on);
    return () => toastBus.removeEventListener('toast', on);
  }, []);

  return createPortal(
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-2xl glass-strong px-4 py-3 text-sm text-[var(--text-primary)] shadow-lg" style={{ animation: 'toast-in .4s cubic-bezier(.2,.7,.2,1) both' }}>
          {t.kind === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" />}
          {t.kind === 'error' && <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />}
          {t.kind === 'info' && <Info size={18} className="mt-0.5 shrink-0 text-brand-300" />}
          <span>{t.text}</span>
        </div>
      ))}
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}`}</style>
    </div>,
    document.body
  );
}
