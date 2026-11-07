import type { RawSheet } from './readWorkbook';

type Pending = { resolve: (s: RawSheet[]) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; sheets?: RawSheet[]; error?: string }>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.ok) job.resolve(e.data.sheets ?? []);
      else job.reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      pending.forEach((p) => p.reject(new Error('Parser crashed')));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

export const ACCEPTED = '.xlsx,.xls,.xlsm,.xlsb,.ods,.csv,.tsv,.txt,.json';

/** Parse off the main thread so huge sheets never freeze the UI. */
export async function parseBuffer(name: string, buffer: ArrayBuffer): Promise<RawSheet[]> {
  const w = getWorker();
  if (!w) {
    const { readWorkbook } = await import('./readWorkbook');
    return readWorkbook(name, buffer);
  }
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, name, buffer }, [buffer]);
  });
}
