import { localRequest } from './localDb';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export type DataMode = 'server' | 'local';

let mode: DataMode | null = null;
let probing: Promise<DataMode> | null = null;
const listeners = new Set<(m: DataMode) => void>();

function setMode(next: DataMode) {
  mode = next;
  listeners.forEach((fn) => fn(next));
}

export function onModeChange(fn: (m: DataMode) => void) {
  listeners.add(fn);
  if (mode) fn(mode);
  return () => {
    listeners.delete(fn);
  };
}

export function getMode() {
  return mode;
}

/** Decide once per page load whether a live API + database is reachable. */
function resolveMode(): Promise<DataMode> {
  if (mode) return Promise.resolve(mode);
  probing ??= (async () => {
    const forced = localStorage.getItem('schedulai.mode');
    if (forced === 'local') {
      setMode('local');
      return 'local' as const;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1800);
      const res = await fetch(`${BASE}/api/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      setMode(res.ok && data.database === 'connected' ? 'server' : 'local');
    } catch {
      setMode('local');
    }
    return getMode() ?? 'local';
  })();
  return probing;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const current = await resolveMode();
  if (current === 'local') return (await localRequest(method, path, body)) as T;

  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Server went away mid-session: keep the demo usable.
    setMode('local');
    return (await localRequest(method, path, body)) as T;
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};
