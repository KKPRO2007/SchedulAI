import { useCallback, useEffect, useState } from 'react';
import { api, onModeChange, type DataMode } from './api';
import type { EntityKey, EntityMap } from './types';

const bus = new EventTarget();

/** Tell every mounted list that the data changed (after import, reset, edits). */
export function notifyDataChanged() {
  bus.dispatchEvent(new Event('change'));
}

export function useEntity<K extends EntityKey>(key: K) {
  const [rows, setRows] = useState<EntityMap[K][] | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    api
      .get<EntityMap[K][]>(`/${key}`)
      .then((r) => {
        setRows(r);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load data'));
  }, [key]);

  useEffect(() => {
    reload();
    const on = () => reload();
    bus.addEventListener('change', on);
    return () => bus.removeEventListener('change', on);
  }, [reload]);

  return { rows, setRows, error, reload };
}

export function useAllData() {
  const faculty = useEntity('faculty');
  const rooms = useEntity('rooms');
  const sections = useEntity('sections');
  const subjects = useEntity('subjects');
  const ready = Boolean(faculty.rows && rooms.rows && sections.rows && subjects.rows);
  return {
    ready,
    faculty: faculty.rows ?? [],
    rooms: rooms.rows ?? [],
    sections: sections.rows ?? [],
    subjects: subjects.rows ?? [],
    error: faculty.error || rooms.error || sections.error || subjects.error,
  };
}

export function useDataMode() {
  const [mode, setMode] = useState<DataMode | null>(null);
  useEffect(() => onModeChange(setMode), []);
  return mode;
}
