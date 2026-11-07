import { crudRouter, isBlank, isPositive, trim } from './crud.js';

export default crudRouter({
  table: 'subjects',
  fields: {
    code: 'code', name: 'name', department: 'department',
    semester: 'semester', credits: 'credits', weeklyHours: 'weekly_hours',
  },
  select: 'id, code, name, department, semester, credits, weekly_hours AS "weeklyHours"',
  conflict: { key: 'code', column: 'code' },
  normalize: (b) => ({
    ...b,
    code: typeof b.code === 'string' ? b.code.trim().toUpperCase() : b.code,
    name: trim(b.name),
    department: trim(b.department),
  }),
  validate: (b) => {
    if (isBlank(b.code) || isBlank(b.name) || isBlank(b.department)) {
      return 'Code, name and department are required';
    }
    if (!(Number(b.semester) >= 1 && Number(b.semester) <= 8)) return 'Semester must be 1 to 8';
    if (!isPositive(b.credits) || !isPositive(b.weeklyHours)) {
      return 'Credits and weekly hours must be greater than 0';
    }
    return null;
  },
});
