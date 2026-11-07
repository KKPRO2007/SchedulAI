import { useEffect, useRef, useState } from 'react';

/** Animated number that eases from its previous value to the new one. */
export default function CountUp({ value, duration = 1200, decimals = 0, suffix = '' }: { value: number | null; duration?: number; decimals?: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (value === null) return;
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - p, 4);
      const v = a + (value - a) * eased;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  if (value === null) return <span className="skeleton inline-block h-[0.9em] w-12 align-middle" />;
  return (
    <span className="tabular-nums">
      {shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
