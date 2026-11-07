import { useRef, type CSSProperties, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
  scale?: number;
  style?: CSSProperties;
  onClick?: () => void;
  as?: 'div' | 'article' | 'button';
};

/**
 * 3D perspective tilt that follows the pointer, with a moving glare highlight
 * and spotlight border (uses the .spotlight CSS vars --mx / --my).
 */
export default function Tilt({ children, className = '', max = 9, glare = true, scale = 1.015, style, onClick, as = 'div' }: Props) {
  const ref = useRef<HTMLElement>(null);
  const raf = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) scale3d(${scale},${scale},${scale})`;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      el.style.setProperty('--glare-o', '1');
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    el.style.setProperty('--glare-o', '0');
  };

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={onClick}
      style={{ transition: 'transform 0.25s cubic-bezier(0.2,0.7,0.2,1)', transformStyle: 'preserve-3d', willChange: 'transform', ...style }}
      className={`spotlight ${className}`}
    >
      {children}
      {glare && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            opacity: 'var(--glare-o, 0)',
            transition: 'opacity 0.3s',
            background: 'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.12), transparent 40%)',
            zIndex: 2,
          }}
        />
      )}
    </Tag>
  );
}
