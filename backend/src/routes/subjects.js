import { crudRouter, isBlank, isPositive } from './crud.js';

export default crudRouter({
  table: 'subjects',
  fields: {
    code: 'code', name: 'name', department: 'department',
    semester: 'semester', credits: 'credits', weeklyHours: 'weekly_hours',
  },
  select: 'id, code, name, department, semester, credits, weekly_hours AS "weeklyHours"',
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