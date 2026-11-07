import { crudRouter, isBlank, isPositive, trim } from './crud.js';

export default crudRouter({
  table: 'sections',
  fields: { name: 'name', department: 'department', semester: 'semester', students: 'students', shift: 'shift' },
  select: 'id, name, department, semester, students, shift',
  defaults: { shift: 'Shift 1' },
  conflict: { key: 'name', column: 'name' },
  normalize: (b) => ({ ...b, name: trim(b.name), department: trim(b.department) }),
  validate: (b) => {
    if (isBlank(b.name) || isBlank(b.department)) return 'Name and department are required';
    if (!(Number(b.semester) >= 1 && Number(b.semester) <= 8)) return 'Semester must be 1 to 8';
    if (!isPositive(b.students)) return 'Students must be greater than 0';
    return null;
  },
});
