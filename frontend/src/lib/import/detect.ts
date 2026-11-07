import { ENTITIES, ENTITY_ORDER, normalizeRecord, validateRecord } from '../entities';
import type { EntityKey } from '../types';
import type { RawSheet } from './readWorkbook';

/* ------------------------------------------------------------------ */
/*  Header matching                                                    */
/* ------------------------------------------------------------------ */

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[_./\\\-|:()[\]#*]+/g, ' ')
    .replace(/[^a-z0-9+& ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const SHARED_FIELDS = new Set(['department', 'semester']);

type Candidate = { col: number; entity: EntityKey; field: string; score: number; generic: boolean };

function matchScore(header: string, synonym: string): number {
  const h = norm(header);
  const s = norm(synonym);
  if (!h || !s) return 0;
  if (h === s) return 1;
  // whole-word containment: "teacher name (full)" contains "teacher name"
  const padded = ` ${h} `;
  if (padded.includes(` ${s} `)) return 0.55 + Math.min(0.3, s.length / 60);
  // abbreviations like "dept." or "sem" glued to a number: "sem3"
  if (h.startsWith(s) && s.length >= 3 && /^\d/.test(h.slice(s.length))) return 0.5;
  return 0;
}

function candidatesFor(headers: string[], entity: EntityKey, allowGeneric: boolean): Candidate[] {
  const out: Candidate[] = [];
  headers.forEach((header, col) => {
    for (const f of ENTITIES[entity].fields) {
      let best = 0;
      for (const syn of f.synonyms) best = Math.max(best, matchScore(header, syn));
      let generic = false;
      if (allowGeneric && f.generic) {
        for (const syn of f.generic) {
          const sc = matchScore(header, syn) * 0.8;
          if (sc > best) {
            best = sc;
            generic = true;
          }
        }
      }
      if (best > 0) out.push({ col, entity, field: f.key, score: best, generic });
    }
  });
  return out;
}

/* ------------------------------------------------------------------ */
/*  Value cleaning + inference                                         */
/* ------------------------------------------------------------------ */

const DEPT_CODES: Record<string, string> = {
  cse: 'Computer Science', cs: 'Computer Science', csc: 'Computer Science', comp: 'Computer Science', 'computer science': 'Computer Science', 'computer science and engineering': 'Computer Science', 'computer science & engineering': 'Computer Science',
  it: 'Information Technology', 'information technology': 'Information Technology',
  ece: 'Electronics & Communication', ec: 'Electronics & Communication', etc: 'Electronics & Communication', electronics: 'Electronics & Communication', 'electronics and communication': 'Electronics & Communication', 'electronics & communication': 'Electronics & Communication',
  ee: 'Electrical Engineering', eee: 'Electrical Engineering', electrical: 'Electrical Engineering', 'electrical engineering': 'Electrical Engineering',
  me: 'Mechanical Engineering', mech: 'Mechanical Engineering', mechanical: 'Mechanical Engineering', 'mechanical engineering': 'Mechanical Engineering',
  ce: 'Civil Engineering', civil: 'Civil Engineering', 'civil engineering': 'Civil Engineering',
  math: 'Mathematics', maths: 'Mathematics', mathematics: 'Mathematics', ma: 'Mathematics',
  phy: 'Physics', physics: 'Physics', ph: 'Physics',
  chem: 'Chemistry', chemistry: 'Chemistry', ai: 'Artificial Intelligence', aiml: 'AI & Machine Learning', ds: 'Data Science',
};

const titleCase = (s: string) => s.replace(/\w\S*/g, (w) => (w.length <= 3 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()));

export function cleanDepartment(v: string): string {
  const key = norm(v).replace(/ dept$| department$/, '');
  return DEPT_CODES[key] ?? titleCase(v.trim());
}

/** Find a department code hidden in a sheet/file name like "CSE_faculty_2026.xlsx". */
function departmentFromText(text: string): string | null {
  const tokens = norm(text).split(' ');
  for (const t of tokens) if (DEPT_CODES[t] && t.length >= 2 && t !== 'it' && t !== 'me' && t !== 'ma') return DEPT_CODES[t];
  // "it"/"me" are common English words: only trust them uppercase in the original
  const m = text.match(/(?:^|[^A-Za-z])(IT|ME|CE|EE)(?:[^A-Za-z]|$)/);
  return m ? DEPT_CODES[m[1].toLowerCase()] : null;
}

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };

export function parseSemester(v: string): number | null {
  const s = norm(v);
  const roman = s.match(/\b(viii|vii|vi|iv|v|iii|ii|i)\b/);
  const digit = s.match(/\d+/);
  const n = digit ? Number(digit[0]) : roman ? ROMAN[roman[1]] : NaN;
  if (/year|yr/.test(s) && n >= 1 && n <= 4) return n * 2 - 1;
  return n >= 1 && n <= 8 ? n : null;
}

function parseNumber(v: string): number | null {
  if (!v) return null;
  // "3-1-2" / "3+1+2" style L-T-P loads add up
  if (/^\s*\d+(\s*[-+]\s*\d+){1,3}\s*$/.test(v)) return v.split(/[-+]/).reduce((a, b) => a + Number(b), 0);
  const m = v.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return m ? Math.round(Number(m[0])) : null;
}

function parseBool(v: string): boolean | null {
  const s = norm(v);
  if (!s) return null;
  if (/^(yes|y|true|1|active|available|present|on|ok|free|open)$/.test(s)) return true;
  if (/^(no|n|false|0|inactive|unavailable|on leave|leave|busy|closed|maintenance|blocked|off)$/.test(s)) return false;
  return null;
}

function parseRoomType(v: string): 'Classroom' | 'Laboratory' | 'Seminar Hall' | null {
  const s = norm(v);
  if (!s) return null;
  if (/lab|practical|workshop|studio/.test(s)) return 'Laboratory';
  if (/seminar|auditorium|conference|hall|amphi/.test(s)) return 'Seminar Hall';
  if (/class|lecture|theory|room|tutorial|lt\b/.test(s)) return 'Classroom';
  return null;
}

function parseShift(v: string): string | null {
  const s = norm(v);
  if (!s) return null;
  if (/4|fourth|iv\b|night|d\b/.test(s)) return 'Shift 4';
  if (/3|third|iii\b|c\b/.test(s)) return 'Shift 3';
  if (/2|second|evening|afternoon|ii\b|day|b\b/.test(s)) return 'Shift 2';
  if (/1|first|morning|i\b|a\b/.test(s)) return 'Shift 1';
  return null;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/* ------------------------------------------------------------------ */
/*  Sheet analysis                                                     */
/* ------------------------------------------------------------------ */

export type Override = EntityKey | 'auto' | 'ignore';

export type EntityMapping = { entity: EntityKey; fields: Record<string, number>; derived: boolean };

export type SheetAnalysis = {
  name: string;
  headerRow: number;
  headers: string[];
  body: string[][];
  primary: EntityKey | null;
  confidence: number;
  mappings: EntityMapping[];
  override: Override;
};

export type ParsedFile = {
  id: string;
  name: string;
  size: number;
  ext: string;
  demo?: boolean;
  parseMs: number;
  sheets: SheetAnalysis[];
};

function pickHeaderRow(rows: string[][]): number {
  let best = 0;
  let bestScore = -1;
  const limit = Math.min(rows.length, 12);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    const filled = row.filter((c) => c !== '');
    if (filled.length < 2) continue;
    const textual = filled.filter((c) => !/^\d+(\.\d+)?$/.test(c)).length;
    let hits = 0;
    for (const e of ENTITY_ORDER) hits += candidatesFor(row, e, true).filter((c) => c.score >= 0.5).length;
    const score = hits * 2 + textual * 0.3 + filled.length * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function analyzeSheet(raw: RawSheet, fileName: string, override: Override = 'auto'): SheetAnalysis {
  const headerRow = pickHeaderRow(raw.rows);
  const headers = raw.rows[headerRow] ?? [];
  const body = raw.rows.slice(headerRow + 1);
  const context = `${fileName} ${raw.name}`;

  if (override === 'ignore') {
    return { name: raw.name, headerRow, headers, body, primary: null, confidence: 0, mappings: [], override };
  }

  // 1. Score each entity to choose the sheet's main subject.
  const scores = ENTITY_ORDER.map((entity) => {
    const cands = candidatesFor(headers, entity, true);
    const perField = new Map<string, number>();
    cands.forEach((c) => perField.set(c.field, Math.max(perField.get(c.field) ?? 0, c.score * (SHARED_FIELDS.has(c.field) ? 0.35 : 1))));
    let score = [...perField.values()].reduce((a, b) => a + b, 0);
    const ctx = norm(context);
    if (ENTITIES[entity].hints.some((h) => ` ${ctx} `.includes(` ${h}`))) score += 0.6;
    return { entity, score };
  }).sort((a, b) => b.score - a.score);

  const primary: EntityKey | null = override !== 'auto' ? override : scores[0].score >= 0.9 ? scores[0].entity : null;
  const total = scores.reduce((a, b) => a + b.score, 0) || 1;
  const confidence = primary ? Math.min(0.99, (scores.find((s) => s.entity === primary)!.score / total) * 0.6 + Math.min(1, scores[0].score / 4) * 0.4) : 0;

  // 2. Global greedy assignment: each column goes to its best (entity, field),
  //    except department/semester which every entity on the sheet can share.
  const all: Candidate[] = ENTITY_ORDER.flatMap((e) => candidatesFor(headers, e, e === primary));
  all.sort((a, b) => b.score - a.score || (a.entity === primary ? -1 : 1));
  const owner = new Map<number, EntityKey>();
  const fields: Record<EntityKey, Record<string, number>> = { faculty: {}, rooms: {}, sections: {}, subjects: {} };
  for (const c of all) {
    if (fields[c.entity][c.field] !== undefined) continue;
    if (!SHARED_FIELDS.has(c.field)) {
      const o = owner.get(c.col);
      if (o && o !== c.entity) continue;
      if (o === c.entity && Object.values(fields[c.entity]).includes(c.col)) continue;
      owner.set(c.col, c.entity);
    }
    fields[c.entity][c.field] = c.col;
  }

  // 3. Emit the primary entity plus any others whose anchor column is present ("derived").
  const anchors: Record<EntityKey, string[]> = { faculty: ['name', 'email'], rooms: ['name'], sections: ['name'], subjects: ['code', 'name'] };
  const mappings: EntityMapping[] = [];
  for (const entity of ENTITY_ORDER) {
    const f = fields[entity];
    const hasAnchor = anchors[entity].some((a) => f[a] !== undefined);
    if (!hasAnchor) continue;
    if (entity !== primary && Object.keys(f).filter((k) => !SHARED_FIELDS.has(k)).length === 0) continue;
    mappings.push({ entity, fields: f, derived: entity !== primary });
  }
  mappings.sort((a, b) => Number(a.derived) - Number(b.derived));

  return { name: raw.name, headerRow, headers, body, primary, confidence, mappings, override };
}

/* ------------------------------------------------------------------ */
/*  Building the import plan                                           */
/* ------------------------------------------------------------------ */

export type PlannedRow = {
  data: Record<string, unknown>;
  inferred: string[];
  error: string | null;
  source: string;
  merged: number;
};

export type Assignment = { section?: string; subject: string; faculty?: string };

export type ImportPlan = {
  rows: Record<EntityKey, PlannedRow[]>;
  assignments: Assignment[];
  sheetsUsed: number;
  cellsScanned: number;
};

function buildRecord(entity: EntityKey, row: string[], map: Record<string, number>, ctxDept: string | null, emailDomain: string) {
  const get = (k: string) => (map[k] !== undefined ? (row[map[k]] ?? '').trim() : '');
  const inferred: string[] = [];
  const r: Record<string, unknown> = {};

  const dept = get('department');
  const sem = get('semester');

  switch (entity) {
    case 'faculty': {
      let name = get('name');
      let email = get('email');
      if (!name && email) {
        name = titleCase(email.split('@')[0].replace(/[._\d]+/g, ' ').trim());
        inferred.push('name');
      }
      if (!email && name) {
        const parts = slug(name);
        email = `${parts.join('.')}@${emailDomain}`;
        inferred.push('email');
      }
      r.name = name;
      r.email = email;
      r.department = dept ? cleanDepartment(dept) : ctxDept ?? '';
      if (!dept && r.department) inferred.push('department');
      if (!r.department) {
        r.department = 'General';
        inferred.push('department');
      }
      r.designation = get('designation') || null;
      r.maxWorkload = parseNumber(get('maxWorkload')) ?? 18;
      r.preferredWindow = get('preferredWindow');
      const avail = parseBool(get('available'));
      r.available = avail ?? true;
      break;
    }
    case 'rooms': {
      const name = get('name');
      r.name = name;
      const typed = parseRoomType(get('type')) ?? null;
      r.type = typed ?? (/^sh[\s-]?\d/i.test(name) ? 'Seminar Hall' : parseRoomType(name) ?? 'Classroom');
      if (!typed) inferred.push('type');
      let building = get('building');
      if (!building && name) {
        const m = name.match(/^([A-Za-z]{1,4})[\s-]?\d/) ?? name.match(/^([A-Za-z]{1,4})[\s-]/);
        const code = m && !/^(room|rm|lab|hall|lt|no)$/i.test(m[1]) ? m[1].toUpperCase() : null;
        building = !code ? 'Main Building' : code.length === 1 ? `Block ${code}` : `${code} Block`;
        inferred.push('building');
      } else if (/^[A-Za-z]$/.test(building)) {
        building = `Block ${building.toUpperCase()}`;
      }
      r.building = building;
      const cap = parseNumber(get('capacity'));
      r.capacity = cap ?? (r.type === 'Laboratory' ? 36 : r.type === 'Seminar Hall' ? 150 : 60);
      if (cap === null) inferred.push('capacity');
      r.available = parseBool(get('available')) ?? true;
      break;
    }
    case 'sections': {
      const name = get('name');
      r.name = name;
      const s = parseSemester(sem) ?? parseSemester(name.replace(/^[A-Za-z]+/, ''));
      r.semester = s ?? 1;
      if (!parseSemester(sem)) inferred.push('semester');
      const code = name.match(/^([A-Za-z]{2,5})/)?.[1];
      r.department = dept ? cleanDepartment(dept) : (code && DEPT_CODES[code.toLowerCase()]) || ctxDept || 'General';
      if (!dept) inferred.push('department');
      const st = parseNumber(get('students'));
      r.students = st ?? 60;
      if (st === null) inferred.push('students');
      r.shift = parseShift(get('shift')) ?? 'Shift 1';
      break;
    }
    case 'subjects': {
      let code = get('code');
      const name = get('name');
      r.name = name || code;
      const s = parseSemester(sem);
      r.semester = s ?? (parseSemester(code.replace(/^[A-Za-z]+/, '').slice(0, 1)) || 1);
      if (!s) inferred.push('semester');
      r.department = dept ? cleanDepartment(dept) : ctxDept ?? 'General';
      if (!dept) inferred.push('department');
      if (!code && name) {
        const initials = slug(name).map((w) => w[0]).join('').toUpperCase().slice(0, 4) || 'SUB';
        code = `${initials}${r.semester}${String(Math.abs(hash(name)) % 90 + 10)}`;
        inferred.push('code');
      }
      r.code = code;
      const isLab = /lab|practical|workshop/i.test(String(r.name));
      const credits = parseNumber(get('credits'));
      const hours = parseNumber(get('weeklyHours'));
      r.weeklyHours = hours ?? (isLab ? 2 : credits ?? 3);
      r.credits = credits ?? (isLab ? 2 : Math.min(4, Number(r.weeklyHours)) || 3);
      if (hours === null) inferred.push('weeklyHours');
      if (credits === null) inferred.push('credits');
      break;
    }
  }
  return { record: normalizeRecord(entity, r), inferred };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function dominantDomain(files: ParsedFile[]): string {
  const counts = new Map<string, number>();
  for (const f of files) for (const s of f.sheets) for (const m of s.mappings) {
    if (m.entity !== 'faculty' || m.fields.email === undefined) continue;
    for (const row of s.body) {
      const domain = (row[m.fields.email] ?? '').split('@')[1]?.trim().toLowerCase();
      if (domain) counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'college.edu';
}

export function buildPlan(files: ParsedFile[], emailDomain = dominantDomain(files)): ImportPlan {
  const rows: ImportPlan['rows'] = { faculty: [], rooms: [], sections: [], subjects: [] };
  const index: Record<EntityKey, Map<string, PlannedRow>> = { faculty: new Map(), rooms: new Map(), sections: new Map(), subjects: new Map() };
  const assignments: Assignment[] = [];
  const seenAssign = new Set<string>();
  let sheetsUsed = 0;
  let cellsScanned = 0;

  for (const file of files) {
    for (const sheet of file.sheets) {
      if (!sheet.mappings.length) continue;
      sheetsUsed++;
      cellsScanned += sheet.body.length * sheet.headers.length;
      const ctxDept = departmentFromText(`${file.name} ${sheet.name}`);
      const byEntity = Object.fromEntries(sheet.mappings.map((m) => [m.entity, m])) as Partial<Record<EntityKey, EntityMapping>>;

      sheet.body.forEach((row, i) => {
        const keys: Partial<Record<EntityKey, string>> = {};
        for (const m of sheet.mappings) {
          const { record, inferred } = buildRecord(m.entity, row, m.fields, ctxDept, emailDomain);
          const ukey = String(record[ENTITIES[m.entity].uniqueKey] ?? '').toLowerCase();
          if (!ukey && m.derived) continue;
          if (!Object.values(m.fields).some((c) => (row[c] ?? '') !== '')) continue;
          keys[m.entity] = String(record[ENTITIES[m.entity].uniqueKey] ?? '');
          const existing = ukey ? index[m.entity].get(ukey) : undefined;
          if (existing) {
            // Same record seen again (e.g. one faculty teaching many subjects): fill gaps only.
            existing.merged++;
            for (const k of existing.inferred.slice()) {
              if (!inferred.includes(k)) {
                existing.data[k] = record[k];
                existing.inferred = existing.inferred.filter((x) => x !== k);
              }
            }
            continue;
          }
          const planned: PlannedRow = {
            data: record,
            inferred,
            error: validateRecord(m.entity, record),
            source: `${file.name} › ${sheet.name} › row ${sheet.headerRow + i + 2}`,
            merged: 0,
          };
          rows[m.entity].push(planned);
          if (ukey) index[m.entity].set(ukey, planned);
        }
        if (byEntity.subjects && (keys.sections || keys.faculty) && keys.subjects) {
          const facultyEmail = keys.faculty;
          const sig = `${keys.sections}|${keys.subjects}|${facultyEmail}`;
          if (!seenAssign.has(sig)) {
            seenAssign.add(sig);
            assignments.push({ section: keys.sections, subject: keys.subjects, faculty: facultyEmail });
          }
        }
      });
    }
  }
  return { rows, assignments, sheetsUsed, cellsScanned };
}

export function analyzeFile(name: string, size: number, sheets: RawSheet[], parseMs: number, demo = false): ParsedFile {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'file';
  return {
    id: `${name}-${size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    size,
    ext,
    demo,
    parseMs,
    sheets: sheets.map((s) => analyzeSheet(s, name)),
  };
}

export function reanalyze(file: ParsedFile, sheetIndex: number, override: Override): ParsedFile {
  const sheet = file.sheets[sheetIndex];
  const raw: RawSheet = { name: sheet.name, rows: [sheet.headers, ...sheet.body] };
  const next = analyzeSheet(raw, file.name, override);
  // keep the original header position for row numbers
  next.headerRow = sheet.headerRow + next.headerRow;
  return { ...file, sheets: file.sheets.map((s, i) => (i === sheetIndex ? next : s)) };
}
