import * as XLSX from 'xlsx';

export type RawSheet = { name: string; rows: string[][] };
export type ParseRequest = { id: number; name: string; buffer: ArrayBuffer };

const MAX_ROWS = 20000;

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
};

function fromJson(text: string): RawSheet[] {
  const data = JSON.parse(text) as unknown;
  const toSheet = (name: string, list: unknown): RawSheet | null => {
    if (!Array.isArray(list) || list.length === 0) return null;
    if (Array.isArray(list[0])) return { name, rows: (list as unknown[][]).map((r) => r.map(cell)) };
    const objects = list.filter((r) => r && typeof r === 'object') as Record<string, unknown>[];
    const headers = [...new Set(objects.flatMap((o) => Object.keys(o)))];
    return { name, rows: [headers, ...objects.map((o) => headers.map((h) => cell(o[h])))] };
  };
  if (Array.isArray(data)) return [toSheet('data', data)].filter(Boolean) as RawSheet[];
  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => toSheet(k, v))
      .filter(Boolean) as RawSheet[];
  }
  throw new Error('JSON must be an array of rows or an object of arrays');
}

/** Reads any spreadsheet-like file (xlsx, xls, xlsb, ods, csv, tsv, txt, json) into string grids. */
export function readWorkbook(name: string, buffer: ArrayBuffer): RawSheet[] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.json')) return fromJson(new TextDecoder().decode(buffer));

  const wb = XLSX.read(buffer, { type: 'array', cellDates: true, dense: true });
  return wb.SheetNames.map((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false, raw: false });
    const rows = grid
      .slice(0, MAX_ROWS)
      .map((r) => r.map(cell))
      .filter((r) => r.some((c) => c !== ''));
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
    return { name: sheetName, rows: rows.map((r) => (r.length < width ? [...r, ...Array(width - r.length).fill('')] : r)) };
  }).filter((s) => s.rows.length > 0);
}
