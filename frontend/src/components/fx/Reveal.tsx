import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Fades + lifts its children into view the first time they scroll on screen. */
export default function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setSeen(true);
      io.disconnect();
      window.removeEventListener('scroll', check);
    };
    // Fallback: a jump or fast flick can move an element from below the screen to above it
    // without ever "intersecting", so also reveal anything whose top is above the fold.
    const check = () => {
      if (el.getBoundingClientRect().top < window.innerHeight) reveal();
    };
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && reveal(), { threshold: 0.01, rootMargin: '0px 0px -24px 0px' });
    io.observe(el);
    window.addEventListener('scroll', check, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', check);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? 'none' : 'translate3d(0, 28px, 0)',
        filter: seen ? 'none' : 'blur(6px)',
        transition: `opacity 0.8s ${delay}ms, transform 0.9s cubic-bezier(0.2,0.7,0.2,1) ${delay}ms, filter 0.8s ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
