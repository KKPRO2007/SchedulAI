import { useCallback, useEffect, useState } from 'react';
import { generateTimetable, loadAssignments, loadTimetable, saveTimetable, type Timetable } from './scheduler';
import { useAllData } from './useData';

/**
 * Loads the saved timetable. With `autoGenerate`, builds one when none exists yet
 * (so the faculty demo always has a published week to look at).
 */
export function useTimetable({ autoGenerate = false } = {}) {
  const data = useAllData();
  const [tt, setTt] = useState<Timetable | null>(() => loadTimetable());
  const [busy, setBusy] = useState(false);

  const generate = useCallback(
    (days?: number) =>
      new Promise<Timetable | null>((resolve) => {
        if (!data.ready) return resolve(null);
        setBusy(true);
        // let the busy state paint before the (fast) synchronous solve
        setTimeout(() => {
          const result = generateTimetable({
            faculty: data.faculty,
            rooms: data.rooms,
            sections: data.sections,
            subjects: data.subjects,
            assignments: loadAssignments(),
            days: days ?? tt?.days.length ?? 5,
          });
          saveTimetable(result);
          setTt(result);
          setBusy(false);
          resolve(result);
        }, 380);
      }),
    [data, tt]
  );

  useEffect(() => {
    if (autoGenerate && !tt && data.ready && data.sections.length > 0) void generate();
  }, [autoGenerate, tt, data.ready, data.sections.length, generate]);

  return { tt, busy, generate, data };
}
