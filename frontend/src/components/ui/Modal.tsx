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
      <div className="absolute inset-0 bg-white/[0.06] " onClick={onClose} />
      <div
        className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-md glass-strong shadow-2xl sm:rounded-2xl ${wide ? 'max-w-6xl' : 'max-w-lg'}`}
        style={{ animation: 'modal-in 0.2s cubic-bezier(0.2,0.7,0.2,1) both' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {icon}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
              {subtitle && <div className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</div>}
            </div>
          </div>
          <button onClick={onClose} className="icon-btn shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
      <style>{`@keyframes modal-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}`}</style>
    </div>,
    document.body
  );
}
