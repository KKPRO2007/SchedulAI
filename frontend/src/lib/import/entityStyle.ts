import type { EntityKey } from '../types';

/** Entity identity colours (validated categorical slots). Text never uses these. */
export const ENTITY_COLOR: Record<EntityKey, string> = {
  faculty: '#2a6fdb',
  rooms: '#d0542a',
  sections: '#16875f',
  subjects: '#7262d6',
};

export const ENTITY_LABEL: Record<EntityKey, string> = {
  faculty: 'Faculty',
  rooms: 'Rooms',
  sections: 'Sections',
  subjects: 'Subjects',
};

export const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
