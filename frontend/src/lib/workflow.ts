import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Timetable } from './scheduler';
import type { AuditEntry, ChangeRequest, ScoreReport, VersionStatus, VersionSummary } from './types';

// Versions, change requests and audit (synopsis §3.1, §8.3, Fig. 6).

export type Version = VersionSummary & { payload: Timetable };

const bus = new EventTarget();
export const notifyWorkflow = () => bus.dispatchEvent(new Event('change'));

/** GET a path, refetching whenever the workflow changes. `null` path = nothing to load. */
function useGet<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data: T | null; error: string }>({ path: null, data: null, error: '' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    bus.addEventListener('change', on);
    return () => bus.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (!path) return;
    let live = true;
    api
      .get<T>(path)
      .then((data) => live && setState({ path, data, error: '' }))
      .catch((e) => live && setState({ path, data: null, error: e instanceof Error ? e.message : 'Could not load' }));
    return () => {
      live = false;
    };
  }, [path, tick]);

  const loaded = path !== null && state.path === path;
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: loaded ? state.data : null, error: loaded ? state.error : '', loading: path !== null && !loaded, reload };
}

export const usePublished = () => useGet<Version | null>('/versions/published');
export const useVersions = () => useGet<VersionSummary[]>('/versions');
export const useVersion = (id: number | null) => useGet<Version>(id ? `/versions/${id}` : null);
export const useRequests = () => useGet<ChangeRequest[]>('/requests');
export const useAudit = () => useGet<AuditEntry[]>('/audit');

export async function createVersion(label: string, payload: Timetable, score: ScoreReport, note?: string) {
  const v = await api.post<VersionSummary>('/versions', { label, payload, score, note });
  notifyWorkflow();
  return v;
}

export async function transition(id: number, to: VersionStatus, note?: string) {
  const v = await api.post<VersionSummary>(`/versions/${id}/transition`, { to, note });
  notifyWorkflow();
  return v;
}

export async function createRequest(input: { type: ChangeRequest['type']; title: string; details?: string; priority?: ChangeRequest['priority']; payload?: Record<string, unknown> }) {
  const r = await api.post<ChangeRequest>('/requests', input);
  notifyWorkflow();
  return r;
}

export async function resolveRequest(id: number, status: 'approved' | 'rejected', resolution?: string) {
  const r = await api.post<ChangeRequest>(`/requests/${id}/resolve`, { status, resolution });
  notifyWorkflow();
  return r;
}

/** Record a client-side event (import, generation run, export). Failures are ignored. */
export function logEvent(action: string, detail?: string) {
  api.post('/audit', { action, detail }).catch(() => {});
}

/** Next label like "v1.3" based on existing versions. */
export function nextLabel(versions: VersionSummary[] | null, suffix: string) {
  const nums = (versions ?? []).map((v) => /^v(\d+)\.(\d+)/.exec(v.label)).filter(Boolean) as RegExpExecArray[];
  const major = nums.length ? Math.max(...nums.map((m) => Number(m[1]))) : 1;
  const minor = nums.filter((m) => Number(m[1]) === major).reduce((a, m) => Math.max(a, Number(m[2])), -1) + 1;
  return `v${major}.${minor} · ${suffix}`;
}

export const STATUS_STYLE: Record<VersionStatus, { label: string; chip: string; dot: string }> = {
  draft: { label: 'Draft', chip: 'border-white/15 bg-white/5 text-[var(--text-secondary)]', dot: 'bg-slate-400' },
  submitted: { label: 'Submitted', chip: 'border-sky-400/30 bg-sky-400/10 text-sky-200', dot: 'bg-sky-400' },
  approved: { label: 'Approved', chip: 'border-violet-400/30 bg-violet-400/10 text-violet-200', dot: 'bg-violet-400' },
  published: { label: 'Published', chip: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', dot: 'bg-emerald-400' },
  archived: { label: 'Archived', chip: 'border-white/10 bg-white/[0.03] text-[var(--text-muted)]', dot: 'bg-slate-600' },
  rejected: { label: 'Rejected', chip: 'border-rose-400/30 bg-rose-400/10 text-rose-200', dot: 'bg-rose-400' },
};
