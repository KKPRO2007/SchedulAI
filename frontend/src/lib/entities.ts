import type { EntityKey } from './types';

export type FieldKind = 'text' | 'email' | 'number' | 'select' | 'bool';

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
  /** Headers that clearly belong to this entity, e.g. "teacher name". */
  synonyms: string[];
  /** Ambiguous headers ("name", "code") only trusted when this entity is the sheet's main one. */
  generic?: string[];
};

export type EntityDef = {
  key: EntityKey;
  label: string;
  singular: string;
  uniqueKey: string;
  /** Header words that hint a sheet is about this entity. */
  hints: string[];
  fields: FieldDef[];
};

export const DEPARTMENT_OPTIONS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Mathematics',
  'Physics',
];

const department: FieldDef = {
  key: 'department',
  label: 'Department',
  kind: 'text',
  required: true,
  placeholder: 'e.g. Computer Science',
  synonyms: ['department', 'dept', 'branch', 'discipline', 'stream', 'programme', 'program', 'school'],
};

const semester: FieldDef = {
  key: 'semester',
  label: 'Semester',
  kind: 'number',
  required: true,
  min: 1,
  max: 8,
  synonyms: ['semester', 'sem', 'term', 'semester no', 'sem no'],
};

export const ENTITIES: Record<EntityKey, EntityDef> = {
  faculty: {
    key: 'faculty',
    label: 'Faculty',
    singular: 'faculty member',
    uniqueKey: 'email',
    hints: ['faculty', 'teacher', 'professor', 'instructor', 'lecturer', 'staff', 'designation', 'email', 'mail', 'employee'],
    fields: [
      { key: 'name', label: 'Full name', kind: 'text', required: true, placeholder: 'e.g. Dr. Priya Sharma', synonyms: ['faculty name', 'faculty', 'teacher', 'teacher name', 'professor', 'instructor', 'lecturer', 'staff name', 'taught by', 'faculty incharge', 'employee name'], generic: ['name', 'full name'] },
      { key: 'email', label: 'Email', kind: 'email', required: true, placeholder: 'name@college.edu', synonyms: ['faculty email', 'teacher email', 'email', 'e-mail', 'mail', 'mail id', 'email id', 'email address', 'official email'] },
      { ...department },
      { key: 'designation', label: 'Designation', kind: 'text', placeholder: 'e.g. Assistant Professor', synonyms: ['designation', 'title', 'position', 'rank', 'post', 'role'] },
      { key: 'available', label: 'Available', kind: 'bool', synonyms: ['available', 'availability', 'active', 'status', 'on duty'] },
    ],
  },
  rooms: {
    key: 'rooms',
    label: 'Rooms & Labs',
    singular: 'room',
    uniqueKey: 'name',
    hints: ['room', 'lab', 'hall', 'block', 'building', 'capacity', 'seats', 'venue', 'floor'],
    fields: [
      { key: 'name', label: 'Room', kind: 'text', required: true, placeholder: 'e.g. A-305', synonyms: ['room', 'room no', 'room number', 'room name', 'room id', 'lab', 'lab name', 'venue', 'classroom', 'hall', 'location code'], generic: ['name', 'id', 'no', 'number'] },
      { key: 'building', label: 'Building', kind: 'text', required: true, placeholder: 'e.g. Academic Block A', synonyms: ['building', 'block', 'wing', 'campus block', 'tower', 'location'] },
      { key: 'type', label: 'Type', kind: 'select', required: true, options: ['Classroom', 'Laboratory', 'Seminar Hall'], synonyms: ['room type', 'type', 'category', 'kind', 'facility type'] },
      { key: 'capacity', label: 'Capacity', kind: 'number', required: true, min: 1, synonyms: ['capacity', 'seats', 'seating', 'seating capacity', 'room capacity', 'max students', 'strength'] },
      { key: 'available', label: 'Available', kind: 'bool', synonyms: ['available', 'availability', 'status', 'usable', 'active'] },
    ],
  },
  sections: {
    key: 'sections',
    label: 'Sections',
    singular: 'section',
    uniqueKey: 'name',
    hints: ['section', 'batch', 'class', 'group', 'division', 'students', 'strength', 'shift', 'cohort'],
    fields: [
      { key: 'name', label: 'Section', kind: 'text', required: true, placeholder: 'e.g. CSE-3A', synonyms: ['section', 'section name', 'batch', 'class', 'class name', 'group', 'division', 'div', 'cohort', 'section code'], generic: ['name', 'id'] },
      { ...department },
      { ...semester },
      { key: 'students', label: 'Students', kind: 'number', required: true, min: 1, synonyms: ['students', 'student count', 'no of students', 'number of students', 'strength', 'class strength', 'enrolled', 'enrollment', 'headcount', 'size'] },
      { key: 'shift', label: 'Shift', kind: 'select', options: ['Shift 1', 'Shift 2'], synonyms: ['shift', 'session', 'timing', 'slot'] },
    ],
  },
  subjects: {
    key: 'subjects',
    label: 'Subjects',
    singular: 'subject',
    uniqueKey: 'code',
    hints: ['subject', 'course', 'paper', 'credit', 'hours', 'lecture', 'syllabus', 'module'],
    fields: [
      { key: 'code', label: 'Code', kind: 'text', required: true, placeholder: 'e.g. CS301', synonyms: ['subject code', 'course code', 'paper code', 'sub code', 'module code', 'course id', 'subject id'], generic: ['code', 'id'] },
      { key: 'name', label: 'Subject', kind: 'text', required: true, placeholder: 'e.g. Operating Systems', synonyms: ['subject', 'subject name', 'course', 'course name', 'course title', 'subject title', 'paper', 'paper name', 'module', 'title'], generic: ['name'] },
      { ...department },
      { ...semester },
      { key: 'credits', label: 'Credits', kind: 'number', required: true, min: 1, max: 10, synonyms: ['credits', 'credit', 'credit points', 'cr', 'credit hours'] },
      { key: 'weeklyHours', label: 'Hours / week', kind: 'number', required: true, min: 1, max: 20, synonyms: ['weekly hours', 'hours per week', 'hours/week', 'hrs/week', 'hrs per week', 'periods', 'periods per week', 'lectures per week', 'contact hours', 'hours', 'l+t+p', 'l t p', 'ltp', 'load'] },
    ],
  },
};

export const ENTITY_ORDER: EntityKey[] = ['faculty', 'rooms', 'sections', 'subjects'];

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';

export function normalizeRecord(entity: EntityKey, raw: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = { ...raw };
  for (const f of ENTITIES[entity].fields) {
    const v = r[f.key];
    if (f.kind === 'number' && !isBlank(v)) r[f.key] = Number(v);
    if (f.kind === 'text' || f.kind === 'email' || f.kind === 'select') {
      if (typeof v === 'string') r[f.key] = v.trim();
    }
    if (f.kind === 'bool') r[f.key] = isBlank(v) ? true : Boolean(v);
  }
  if (entity === 'faculty' && typeof r.email === 'string') r.email = r.email.toLowerCase();
  if (entity === 'subjects' && typeof r.code === 'string') r.code = r.code.toUpperCase();
  if (entity === 'sections' && isBlank(r.shift)) r.shift = 'Shift 1';
  if (entity === 'faculty' && isBlank(r.designation)) r.designation = null;
  return r;
}

/** Mirrors the backend validators so offline demo mode behaves the same. */
export function validateRecord(entity: EntityKey, r: Record<string, unknown>): string | null {
  const pos = (v: unknown) => Number(v) > 0;
  const sem = (v: unknown) => Number(v) >= 1 && Number(v) <= 8;
  switch (entity) {
    case 'faculty':
      if (isBlank(r.name) || isBlank(r.email) || isBlank(r.department)) return 'Name, email and department are required';
      if (!String(r.email).includes('@')) return 'Enter a valid email';
      return null;
    case 'rooms':
      if (isBlank(r.name) || isBlank(r.building)) return 'Name and building are required';
      if (!['Classroom', 'Laboratory', 'Seminar Hall'].includes(String(r.type))) return 'Room type must be Classroom, Laboratory or Seminar Hall';
      if (!pos(r.capacity)) return 'Capacity must be greater than 0';
      return null;
    case 'sections':
      if (isBlank(r.name) || isBlank(r.department)) return 'Name and department are required';
      if (!sem(r.semester)) return 'Semester must be 1 to 8';
      if (!pos(r.students)) return 'Students must be greater than 0';
      return null;
    case 'subjects':
      if (isBlank(r.code) || isBlank(r.name) || isBlank(r.department)) return 'Code, name and department are required';
      if (!sem(r.semester)) return 'Semester must be 1 to 8';
      if (!pos(r.credits) || !pos(r.weeklyHours)) return 'Credits and weekly hours must be greater than 0';
      return null;
  }
}
