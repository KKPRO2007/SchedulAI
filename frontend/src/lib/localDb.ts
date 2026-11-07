import { buildDemoCampus } from './seed';
import { checkDemoLogin } from './demoAccounts';
import { ENTITY_ORDER, ENTITIES, normalizeRecord, validateRecord } from './entities';
import type { BulkResult, EntityKey } from './types';

// Browser-only stand-in for the API, used automatically when the backend
// or database is not reachable so the free demo always works.

type Row = Record<string, unknown> & { id: number };
type Store = Record<EntityKey, Row[]> & { seq: number };

const KEY = 'schedulai.localdb.v2';

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* fall through to seed */
  }
  return seed();
}

function seed(): Store {
  const campus = buildDemoCampus();
  let seq = 0;
  const withIds = <T extends object>(list: T[]) => list.map((r) => ({ ...r, id: ++seq }) as unknown as Row);
  const store: Store = {
    faculty: withIds(campus.faculty),
    rooms: withIds(campus.rooms),
    sections: withIds(campus.sections),
    subjects: withIds(campus.subjects),
    seq,
  };
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

const keyOf = (entity: EntityKey, r: Record<string, unknown>) =>
  String(r[ENTITIES[entity].uniqueKey] ?? '').trim().toLowerCase();

export function resetLocalDb(empty = false) {
  if (empty) {
    save({ faculty: [], rooms: [], sections: [], subjects: [], seq: 0 });
  } else {
    localStorage.removeItem(KEY);
    cache = null;
    db();
  }
}

export async function localRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const store = db();
  const parts = path.split('?')[0].split('/').filter(Boolean);
  const [resource, id] = parts;

  if (resource === 'health') return { status: 'ok', database: 'local-demo' };

  if (resource === 'stats') {
    return Object.fromEntries(ENTITY_ORDER.map((k) => [k, store[k].length]));
  }

  if (resource === 'auth' && id === 'login') {
    const { email, password } = (body ?? {}) as { email?: string; password?: string };
    const user = checkDemoLogin(String(email ?? ''), String(password ?? ''));
    if (user) return { token: crypto.randomUUID(), user };
    throw new HttpError(401, 'Invalid email or password');
  }

  if (!ENTITY_ORDER.includes(resource as EntityKey)) throw new HttpError(404, 'Not found');
  const entity = resource as EntityKey;
  const table = store[entity];

  if (method === 'GET') return table;

  if (method === 'POST' && id === 'bulk') {
    const rows = ((body as { rows?: unknown[] })?.rows ?? []) as Record<string, unknown>[];
    if ((body as { replace?: boolean })?.replace === true) table.length = 0;
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
    save(store);
    return result;
  }

  if (method === 'POST' || method === 'PUT') {
    const r = normalizeRecord(entity, (body ?? {}) as Record<string, unknown>);
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
