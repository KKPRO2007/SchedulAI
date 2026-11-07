import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  icon?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', on);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', on);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#02030a]/75 backdrop-blur-md" onClick={onClose} />
      <div
        className={`glass-strong relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[1.6rem] sm:rounded-[1.6rem] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] ${wide ? 'max-w-6xl' : 'max-w-lg'}`}
        style={{ animation: 'modal-in 0.35s cubic-bezier(0.2,0.7,0.2,1) both' }}
      >
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            {icon}
            <div className="min-w-0">
              <h2 className="font-display truncate text-lg font-bold text-white">{title}</h2>
              {subtitle && <div className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</div>}
            </div>
          </div>
          <button onClick={onClose} className="icon-btn shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
      <style>{`@keyframes modal-in{from{opacity:0;transform:perspective(1200px) rotateX(8deg) translateY(30px) scale(.96)}to{opacity:1;transform:none}}`}</style>
    </div>,
    document.body
  );
}
