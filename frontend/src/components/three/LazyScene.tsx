import { lazy, Suspense } from 'react';

const Scene3D = lazy(() => import('./Scene3D'));

type Variant = 'hero' | 'app' | 'auth';

/** Strength of the cinematic light layers per page; the dashboard stays calm for readability. */
const LEVEL: Record<Variant, { nebula: number; beam: number; horizon: number; vignette: number }> = {
  hero: { nebula: 1, beam: 1, horizon: 1, vignette: 1 },
  auth: { nebula: 0.75, beam: 0.6, horizon: 0.8, vignette: 0.9 },
  app: { nebula: 0.4, beam: 0, horizon: 0.35, vignette: 0.7 },
};

/**
 * Cinematic backdrop: drifting nebula light behind the WebGL scene, and a sweeping light beam,
 * horizon glow and vignette in front of it. three.js loads after the page has rendered.
 */
export default function LazyScene({ variant }: { variant: Variant }) {
  const l = LEVEL[variant];
  return (
    <>
      {/* Behind the canvas: nebula */}
      <div className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-[#04050c]" aria-hidden="true" style={{ opacity: 1 }}>
        <div className="absolute inset-0" style={{ opacity: l.nebula }}>
          <span className="cine-nebula left-[45%] top-[-15%] h-[75vh] w-[75vw] bg-[radial-gradient(closest-side,rgba(79,70,229,0.55),transparent)]" />
          <span className="cine-nebula left-[-20%] top-[35%] h-[70vh] w-[60vw] bg-[radial-gradient(closest-side,rgba(14,165,233,0.32),transparent)]" style={{ animationDelay: '-8s', animationDuration: '34s' }} />
          <span className="cine-nebula left-[60%] top-[50%] h-[60vh] w-[55vw] bg-[radial-gradient(closest-side,rgba(168,85,247,0.28),transparent)]" style={{ animationDelay: '-15s', animationDuration: '40s' }} />
          <span className="cine-nebula left-[15%] top-[-25%] h-[55vh] w-[45vw] bg-[radial-gradient(closest-side,rgba(20,184,166,0.18),transparent)]" style={{ animationDelay: '-4s', animationDuration: '46s' }} />
        </div>
      </div>

      <Suspense fallback={null}>
        <Scene3D variant={variant} />
      </Suspense>

      {/* In front of the canvas (same layer, later in the DOM): beam, horizon, vignette */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {l.beam > 0 && (
          <span
            className="cine-beam absolute left-[62%] top-[38%] h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
            style={{ opacity: 0.55 * l.beam, background: 'conic-gradient(from 0deg, transparent 0deg, rgba(99,102,241,0.18) 18deg, transparent 40deg, transparent 150deg, rgba(56,189,248,0.14) 168deg, transparent 190deg, transparent 290deg, rgba(167,139,250,0.12) 305deg, transparent 325deg)' }}
          />
        )}
        <span
          className="absolute inset-x-[-10%] top-[68%] h-[30vh] blur-3xl"
          style={{ opacity: l.horizon, background: 'radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.35), rgba(14,165,233,0.12) 55%, transparent 75%)' }}
        />
        <span className="absolute inset-0" style={{ opacity: l.vignette, background: 'radial-gradient(120% 90% at 55% 40%, transparent 55%, rgba(2,3,10,0.85) 100%)' }} />
      </div>
    </>
  );
}
