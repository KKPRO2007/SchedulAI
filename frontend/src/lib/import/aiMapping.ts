import { ENTITIES, ENTITY_ORDER } from '../entities';
import type { EntityKey } from '../types';
import { unmappedColumns, type AiMappingResult, type SheetAnalysis } from './detect';

// Asks the server's AI to map headers the rule-based matcher could not read.
// Only headers and a few sample values leave the browser; the route needs no
// database, so it works in the browser-only demo mode as well.

const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');
const SAMPLE_ROWS = 5;

export async function requestAiMapping(fileName: string, sheet: SheetAnalysis): Promise<AiMappingResult> {
  const unmapped = unmappedColumns(sheet);
  if (!unmapped.length) return { sheetEntity: sheet.primary, columns: [] };

  const fields = Object.fromEntries(
    ENTITY_ORDER.map((e) => [e, ENTITIES[e].fields.map((f) => ({ key: f.key, label: f.label }))]),
  ) as Record<EntityKey, { key: string; label: string }[]>;
  const taken = sheet.mappings.flatMap((m) => Object.keys(m.fields).map((field) => ({ entity: m.entity, field })));
  const samples = sheet.body.filter((row) => row.some((c) => c !== '')).slice(0, SAMPLE_ROWS);

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/import/map-columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, sheetName: sheet.name, primary: sheet.primary, headers: sheet.headers, samples, unmapped, taken, fields }),
    });
  } catch {
    throw new Error('AI mapping needs an internet connection. You can still pick the sheet type manually.');
  }
  const data = (await res.json().catch(() => ({}))) as Partial<AiMappingResult> & { error?: string };
  if (!res.ok) throw new Error(data.error ?? 'AI mapping is not available right now.');
  return { sheetEntity: data.sheetEntity ?? null, columns: Array.isArray(data.columns) ? data.columns : [] };
}
