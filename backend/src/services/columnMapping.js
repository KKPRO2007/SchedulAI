import { completeChat } from './llm/providers.js';

// AI help for the data import: the rule-based matcher maps headers it knows
// ("Faculty Name", "Room No"); headers in other words ("Guru ji", "Kaksha",
// "Bethne ki jagah", abbreviations, typos) are sent here with a few sample values.
// The model only chooses from the field catalog it is given, and every suggestion
// is validated again before it is returned.

export const ENTITY_KEYS = ['faculty', 'rooms', 'sections', 'subjects'];
const MAX_HEADERS = 80;
const MAX_SAMPLE_ROWS = 5;
const MIN_CONFIDENCE = 0.5;

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Validate and trim the request; returns null when it is unusable. */
export function cleanMappingRequest(body) {
  const headers = Array.isArray(body?.headers) ? body.headers.slice(0, MAX_HEADERS).map((h) => text(String(h ?? ''), 80)) : [];
  if (!headers.length) return null;

  const fields = {};
  for (const entity of ENTITY_KEYS) {
    const list = Array.isArray(body?.fields?.[entity]) ? body.fields[entity] : [];
    fields[entity] = list
      .map((f) => ({ key: text(f?.key, 30), label: text(f?.label, 40) }))
      .filter((f) => /^[A-Za-z]+$/.test(f.key))
      .slice(0, 20);
  }
  if (!ENTITY_KEYS.some((e) => fields[e].length)) return null;

  const valid = (col) => Number.isInteger(col) && col >= 0 && col < headers.length;
  const unmapped = [...new Set((Array.isArray(body?.unmapped) ? body.unmapped : []).filter(valid))];
  const taken = (Array.isArray(body?.taken) ? body.taken : [])
    .filter((t) => ENTITY_KEYS.includes(t?.entity) && typeof t?.field === 'string')
    .map((t) => `${t.entity}.${t.field}`);
  const samples = (Array.isArray(body?.samples) ? body.samples : [])
    .slice(0, MAX_SAMPLE_ROWS)
    .map((row) => headers.map((_, i) => text(String(Array.isArray(row) ? row[i] ?? '' : ''), 40)));

  return {
    fileName: text(body?.fileName, 120),
    sheetName: text(body?.sheetName, 60),
    primary: ENTITY_KEYS.includes(body?.primary) ? body.primary : null,
    headers,
    samples,
    fields,
    unmapped,
    taken: new Set(taken),
  };
}

function buildPrompt(req) {
  const catalog = ENTITY_KEYS
    .filter((e) => req.fields[e].length)
    .map((e) => `${e}: ${req.fields[e].map((f) => `${f.key} (${f.label})`).join(', ')}`)
    .join('\n');
  const columns = req.unmapped.map((col) => {
    const values = req.samples.map((row) => row[col]).filter(Boolean).slice(0, 4);
    return `${col}: "${req.headers[col] || `Column ${col + 1}`}"${values.length ? ` e.g. ${values.map((v) => JSON.stringify(v)).join(', ')}` : ''}`;
  }).join('\n');
  const known = req.headers
    .map((h, i) => (req.unmapped.includes(i) ? null : `"${h}"`))
    .filter(Boolean)
    .join(', ');

  return [
    `File: ${req.fileName || 'unknown'} / sheet: ${req.sheetName || 'unknown'}`,
    `Detected sheet type: ${req.primary ?? 'not recognised'}`,
    known ? `Already mapped headers: ${known}` : 'No headers were mapped yet.',
    req.taken.size ? `Fields already taken: ${[...req.taken].join(', ')}` : '',
    '',
    'FIELD CATALOG (entity: field (label))',
    catalog,
    '',
    'UNMAPPED COLUMNS (index: "header" with sample values)',
    columns,
  ].filter((line) => line !== '').join('\n');
}

const SYSTEM = [
  'You map spreadsheet columns for a college timetable data importer.',
  'Headers may be abbreviated, misspelt, or written in Hindi/Hinglish or other languages (e.g. "Guru ji" = teacher name, "Kaksha" = room/class, "Bethne ki jagah" = seats/capacity).',
  'Use the sample values as strong evidence: emails, room codes like A-101, course codes like CS301, small numbers for credits or hours.',
  'Only use entity and field keys from the FIELD CATALOG. Never map a field listed as already taken, and never map two columns to the same entity.field.',
  'Leave out columns that match no field (serial numbers, remarks, signatures). Do not guess wildly.',
  'Reply with JSON only: {"sheetEntity": "<entity or null>", "columns": [{"column": <index>, "entity": "<entity>", "field": "<field key>", "confidence": <0..1>, "reason": "<max 8 words>"}]}',
].join('\n');

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

/** Keep only suggestions that fit the catalog, the unmapped columns and the free fields. */
export function validateSuggestions(req, reply) {
  const used = new Set(req.taken);
  const seenColumns = new Set();
  const columns = [];
  const candidates = Array.isArray(reply?.columns) ? reply.columns : [];
  for (const s of [...candidates].sort((a, b) => (Number(b?.confidence) || 0) - (Number(a?.confidence) || 0))) {
    const column = Number(s?.column);
    const confidence = Math.max(0, Math.min(1, Number(s?.confidence) || 0));
    const fieldOk = ENTITY_KEYS.includes(s?.entity) && req.fields[s.entity].some((f) => f.key === s?.field);
    if (!req.unmapped.includes(column) || !fieldOk || confidence < MIN_CONFIDENCE) continue;
    const key = `${s.entity}.${s.field}`;
    if (used.has(key) || seenColumns.has(column)) continue;
    used.add(key);
    seenColumns.add(column);
    columns.push({ column, entity: s.entity, field: s.field, confidence: Math.round(confidence * 100) / 100, reason: text(s?.reason, 80) });
  }
  const sheetEntity = ENTITY_KEYS.includes(reply?.sheetEntity) ? reply.sheetEntity : null;
  return { sheetEntity, columns: columns.sort((a, b) => a.column - b.column) };
}

/** Returns { sheetEntity, columns } or null when no AI provider answered. */
export async function suggestColumnMapping(req) {
  if (!req.unmapped.length) return { sheetEntity: req.primary, columns: [] };
  const llm = await completeChat({
    system: SYSTEM,
    messages: [{ role: 'user', content: buildPrompt(req) }],
    temperature: 0,
    maxTokens: 900,
    json: true,
  });
  if (!llm) return null;
  const reply = parseJson(llm.text);
  if (!reply) return { sheetEntity: req.primary, columns: [] };
  return validateSuggestions(req, reply);
}
