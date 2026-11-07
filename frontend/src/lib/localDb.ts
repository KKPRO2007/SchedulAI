import { buildDemoCampus } from './seed';
import { checkDemoLogin, type User } from './demoAccounts';
import { ENTITY_ORDER, ENTITIES, normalizeRecord, validateRecord } from './entities';
import { generateTimetable, type Timetable } from './scheduler';
import { scoreTimetable } from './scoring';
import type { AuditEntry, BulkResult, ChangeRequest, EntityKey, Faculty, Room, Section, Subject, VersionStatus } from './types';

// Browser-only stand-in for the API, used automatically when the backend or
// database is not reachable so the free demo always works. It mirrors the
// server's routes and role checks.

type Row = Record<string, unknown> & { id: number };
type VersionRow = {
  id: number;
  label: string;
  status: VersionStatus;
  payload: Timetable;
  score: unknown;
  note: string | null;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};
type Store = Record<EntityKey, Row[]> & {
  seq: number;
  versions: VersionRow[];
  requests: ChangeRequest[];
  audit: AuditEntry[];
};

const KEY = 'schedulai.localdb.v3';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const now = () => new Date().toISOString();

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* fall through to seed */
  }
  return seed();
}

/** Demo campus plus a published v1 so faculty and students have something to see straight away. */
function seed(empty = false): Store {
  const campus = empty ? { faculty: [], rooms: [], sections: [], subjects: [] } : buildDemoCampus();
  let seq = 0;
  const withIds = <T extends object>(list: T[]) => list.map((r) => ({ ...r, id: ++seq }) as unknown as Row);
  const store: Store = {
    faculty: withIds(campus.faculty),
    rooms: withIds(campus.rooms),
    sections: withIds(campus.sections),
    subjects: withIds(campus.subjects),
    seq,
    versions: [],
    requests: [],
    audit: [],
  };
  if (!empty) {
    const ctx = {
      faculty: store.faculty as unknown as Faculty[],
      rooms: store.rooms as unknown as Room[],
      sections: store.sections as unknown as Section[],
      subjects: store.subjects as unknown as Subject[],
    };
    const tt = generateTimetable({ ...ctx, seed: 2026, strategy: 'balanced' });
    const t = now();
    store.versions.push({
      id: 1,
      label: 'v1.0 · Odd semester 2026-27',
      status: 'published',
      payload: tt,
      score: scoreTimetable(tt, ctx),
      note: 'Initial timetable for the demo campus',
      createdBy: 'coordinator@schedulai.app',
      reviewedBy: 'admin@schedulai.app',
      reviewedAt: t,
      publishedAt: t,
      createdAt: t,
    });
    store.requests.push({
      id: 1,
      type: 'leave',
      title: 'On leave Wednesday (conference)',
      details: 'Presenting at a conference. Please arrange substitutes for my Wednesday classes.',
      priority: 'high',
      status: 'pending',
      requestedBy: 'faculty@schedulai.app',
      requesterRole: 'faculty',
      payload: { day: 'Wednesday', facultyEmail: 'faculty@schedulai.app' },
      resolution: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: t,
    });
    store.audit.push(
      { id: 1, actor: 'coordinator@schedulai.app', role: 'coordinator', action: 'created draft', detail: 'v1.0 · Odd semester 2026-27 (#1)', createdAt: t },
      { id: 2, actor: 'admin@schedulai.app', role: 'admin', action: 'version published', detail: 'v1.0 · Odd semester 2026-27 (#1)', createdAt: t },
      { id: 3, actor: 'faculty@schedulai.app', role: 'faculty', action: 'raised request', detail: '#1 On leave Wednesday (conference)', createdAt: t }
    );
  }
  save(store);
  return store;
}

let cache: Store | null = null;
const db = () => (cache ??= load());

function save(store: Store) {
  cache = store;
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked: keep in memory */
  }
}

const keyOf = (entity: EntityKey, r: Record<string, unknown>) => String(r[ENTITIES[entity].uniqueKey] ?? '').trim().toLowerCase();

export function resetLocalDb(empty = false) {
  localStorage.removeItem(KEY);
  cache = null;
  cache = seed(empty);
}

function audit(store: Store, user: User | null, action: string, detail: string | null) {
  store.audit.unshift({ id: store.audit.reduce((m, e) => Math.max(m, e.id), 0) + 1, actor: user?.email ?? 'system', role: user?.role ?? 'system', action, detail, createdAt: now() });
  store.audit = store.audit.slice(0, 300);
}

const staff = (u: User | null) => u?.role === 'admin' || u?.role === 'coordinator';
function need(u: User | null, ...roles: string[]) {
  if (!u) throw new HttpError(401, 'Please sign in');
  if (!roles.includes(u.role)) throw new HttpError(403, `This action needs the ${roles.join(' or ')} role`);
}

const summary = (v: VersionRow) => {
  const { payload, ...rest } = v;
  return { ...rest, sessions: payload.sessions.length };
};

const TRANSITIONS: Record<string, { from: VersionStatus[]; roles: string[] }> = {
  submitted: { from: ['draft', 'rejected'], roles: ['admin', 'coordinator'] },
  approved: { from: ['submitted'], roles: ['admin'] },
  rejected: { from: ['submitted'], roles: ['admin'] },
  published: { from: ['approved', 'archived'], roles: ['admin'] },
  draft: { from: ['rejected'], roles: ['admin', 'coordinator'] },
};

export async function localRequest(method: string, path: string, body: unknown, user: User | null): Promise<unknown> {
  const store = db();
  const b = (body ?? {}) as Record<string, unknown>;
  const parts = path.split('?')[0].split('/').filter(Boolean);
  const [resource, id, action] = parts;

  if (resource === 'health') return { status: 'ok', database: 'local-demo' };

  if (resource === 'auth' && id === 'login') {
    const u = checkDemoLogin(String(b.email ?? ''), String(b.password ?? ''));
    if (!u) throw new HttpError(401, 'Invalid email or password');
    audit(store, u, 'signed in', null);
    save(store);
    return { token: `local.${btoa(u.email)}`, user: u };
  }

  if (!user) throw new HttpError(401, 'Please sign in');

  if (resource === 'stats') return Object.fromEntries(ENTITY_ORDER.map((k) => [k, store[k].length]));

  /* ---------------- versions ---------------- */
  if (resource === 'versions') {
    const visible = (v: VersionRow) => staff(user) || ['published', 'archived'].includes(v.status);
    if (method === 'GET' && !id) return store.versions.filter(visible).map(summary).reverse();
    if (method === 'GET' && id === 'published') {
      const v = [...store.versions].reverse().find((x) => x.status === 'published');
      return v ? { ...summary(v), payload: v.payload } : null;
    }
    if (method === 'GET') {
      const v = store.versions.find((x) => String(x.id) === id);
      if (!v) throw new HttpError(404, 'Not found');
      if (!visible(v)) throw new HttpError(403, 'Not published yet');
      return { ...summary(v), payload: v.payload };
    }
    if (method === 'POST' && !id) {
      need(user, 'admin', 'coordinator');
      const payload = b.payload as Timetable | undefined;
      if (!b.label || !payload?.sessions) throw new HttpError(400, 'label and payload.sessions are required');
      const v: VersionRow = {
        id: (store.versions.at(-1)?.id ?? 0) + 1,
        label: String(b.label).slice(0, 120),
        status: 'draft',
        payload,
        score: b.score ?? null,
        note: (b.note as string) ?? null,
        createdBy: user.email,
        reviewedBy: null,
        reviewedAt: null,
        publishedAt: null,
        createdAt: now(),
      };
      store.versions.push(v);
      audit(store, user, 'created draft', `${v.label} (#${v.id})`);
      save(store);
      return summary(v);
    }
    if (method === 'POST' && action === 'transition') {
      const to = String(b.to ?? '');
      const rule = TRANSITIONS[to];
      if (!rule) throw new HttpError(400, 'Unknown status');
      if (!rule.roles.includes(user.role)) throw new HttpError(403, `Only ${rule.roles.join(' or ')} can mark a version ${to}`);
      const v = store.versions.find((x) => String(x.id) === id);
      if (!v) throw new HttpError(404, 'Not found');
      if (!rule.from.includes(v.status)) throw new HttpError(409, `A ${v.status} version cannot become ${to}`);
      if (to === 'published') store.versions.forEach((x) => x.status === 'published' && (x.status = 'archived'));
      v.status = to as VersionStatus;
      if (b.note) v.note = String(b.note);
      if (['approved', 'rejected', 'published'].includes(to)) {
        v.reviewedBy = user.email;
        v.reviewedAt = now();
      }
      if (to === 'published') v.publishedAt = now();
      audit(store, user, `version ${to}`, `${v.label} (#${v.id})${b.note ? ` · ${b.note}` : ''}`);
      save(store);
      return summary(v);
    }
  }

  /* ---------------- change requests ---------------- */
  if (resource === 'requests') {
    if (method === 'GET') {
      const list = staff(user) ? store.requests : store.requests.filter((r) => r.requestedBy === user.email);
      return [...list].sort((a, c) => Number(c.status === 'pending') - Number(a.status === 'pending') || c.id - a.id);
    }
    if (method === 'POST' && !id) {
      need(user, 'admin', 'coordinator', 'faculty');
      if (!['leave', 'substitution', 'room', 'availability', 'other'].includes(String(b.type))) throw new HttpError(400, 'Unknown request type');
      if (String(b.title ?? '').trim().length < 3) throw new HttpError(400, 'Please add a short title');
      const r: ChangeRequest = {
        id: (store.requests.reduce((m, x) => Math.max(m, x.id), 0) ?? 0) + 1,
        type: b.type as ChangeRequest['type'],
        title: String(b.title).slice(0, 200),
        details: (b.details as string) ?? null,
        priority: ['low', 'normal', 'high'].includes(String(b.priority)) ? (b.priority as ChangeRequest['priority']) : 'normal',
        status: 'pending',
        requestedBy: user.email,
        requesterRole: user.role,
        payload: (b.payload as Record<string, unknown>) ?? null,
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: now(),
      };
      store.requests.push(r);
      audit(store, user, 'raised request', `#${r.id} ${r.title}`);
      save(store);
      return r;
    }
    if (method === 'POST' && action === 'resolve') {
      need(user, 'admin', 'coordinator');
      const r = store.requests.find((x) => String(x.id) === id && x.status === 'pending');
      if (!r) throw new HttpError(409, 'Request not found or already resolved');
      if (!['approved', 'rejected'].includes(String(b.status))) throw new HttpError(400, 'status must be approved or rejected');
      r.status = b.status as ChangeRequest['status'];
      r.resolution = (b.resolution as string) ?? null;
      r.resolvedBy = user.email;
      r.resolvedAt = now();
      audit(store, user, `request ${r.status}`, `#${r.id} ${r.title}`);
      save(store);
      return r;
    }
  }

  /* ---------------- audit ---------------- */
  if (resource === 'audit') {
    if (method === 'GET') {
      need(user, 'admin', 'coordinator');
      return store.audit;
    }
    audit(store, user, String(b.action ?? 'event'), (b.detail as string) ?? null);
    save(store);
    return { ok: true };
  }

  /* ---------------- faculty preferences ---------------- */
  if (resource === 'faculty' && id === 'me' && action === 'preferences') {
    need(user, 'faculty');
    const f = store.faculty.find((x) => String(x.email).toLowerCase() === user.email);
    if (!f) throw new HttpError(404, 'No faculty record matches your account');
    if (!['any', 'morning', 'afternoon'].includes(String(b.preferredWindow))) throw new HttpError(400, 'Invalid window');
    f.preferredWindow = b.preferredWindow;
    audit(store, user, 'updated preferences', `preferred window: ${b.preferredWindow}`);
    save(store);
    return f;
  }

  /* ---------------- master data ---------------- */
  if (!ENTITY_ORDER.includes(resource as EntityKey)) throw new HttpError(404, 'Not found');
  const entity = resource as EntityKey;
  const table = store[entity];

  if (method === 'GET') return table;
  need(user, 'admin', 'coordinator');

  if (method === 'POST' && id === 'bulk') {
    const rows = ((b.rows as unknown[]) ?? []) as Record<string, unknown>[];
    if (b.replace === true) table.length = 0;
    const result: BulkResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const unique = new Map<string, Record<string, unknown>>();
    rows.forEach((raw, index) => {
      const r = normalizeRecord(entity, raw);
      const error = validateRecord(entity, r);
      if (error) result.errors.push({ index, error });
      else unique.set(keyOf(entity, r), r);
    });
    result.skipped = rows.length - unique.size - result.errors.length;
    const index = new Map(table.map((r, i) => [keyOf(entity, r), i]));
    unique.forEach((r, k) => {
      const at = index.get(k);
      if (at !== undefined) {
        table[at] = { ...table[at], ...r, id: table[at].id };
        result.updated++;
      } else {
        table.push({ ...r, id: ++store.seq });
        result.inserted++;
      }
    });
    audit(store, user, b.replace === true ? 'replaced data' : 'imported data', `${entity}: ${result.inserted} added, ${result.updated} updated, ${result.errors.length} rejected`);
    save(store);
    return result;
  }

  if (method === 'POST' || method === 'PUT') {
    const r = normalizeRecord(entity, b);
    const error = validateRecord(entity, r);
    if (error) throw new HttpError(400, error);
    const k = keyOf(entity, r);
    const clash = table.find((row) => keyOf(entity, row) === k && String(row.id) !== String(id));
    if (clash) throw new HttpError(409, 'A record with this value already exists');

    if (method === 'POST') {
      const row = { ...r, id: ++store.seq } as Row;
      table.push(row);
      save(store);
      return row;
    }
    const at = table.findIndex((row) => String(row.id) === String(id));
    if (at === -1) throw new HttpError(404, 'Not found');
    table[at] = { ...r, id: table[at].id } as Row;
    save(store);
    return table[at];
  }

  if (method === 'DELETE') {
    const at = table.findIndex((row) => String(row.id) === String(id));
    if (at === -1) throw new HttpError(404, 'Not found');
    table.splice(at, 1);
    save(store);
    return undefined;
  }

  throw new HttpError(405, 'Method not allowed');
}
