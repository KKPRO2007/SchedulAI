import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/** fallback: render this instead of the recovery card (e.g. null for decorative layers). */
type Props = { children: ReactNode; resetKey?: string; fallback?: ReactNode };
type State = { error: Error | null };

const RELOAD_FLAG = 'schedulai.chunk-reload';

/** A lazy page chunk that no longer exists (usually after a new deploy). */
function isChunkLoadError(error: Error) {
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(`${error.name} ${error.message}`);
}

/**
 * Keeps one broken page from blanking the whole app. Stale chunks after a deploy
 * trigger a single automatic reload; anything else shows a recoverable card.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack);
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1');
      window.location.reload();
    }
  }

  componentDidMount() {
    // The app loaded fine, so a later stale chunk may auto-reload again.
    window.setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    const stale = isChunkLoadError(error);
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg items-center justify-center p-6">
        <div className="glass w-full rounded-3xl border border-white/[0.09] p-7 text-center" role="alert">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
            <AlertTriangle size={22} />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {stale ? 'A new version is available' : 'This page ran into a problem'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {stale
              ? 'SchedulAI was updated while this tab was open. Reload to get the latest version.'
              : 'The rest of the app still works. Try again, or pick another page from the menu.'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {!stale && (
              <button type="button" className="btn btn-secondary" onClick={() => this.setState({ error: null })}>
                <RotateCcw size={15} /> Try again
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                sessionStorage.removeItem(RELOAD_FLAG);
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
