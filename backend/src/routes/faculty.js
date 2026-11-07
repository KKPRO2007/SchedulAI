import { crudRouter, isBlank, trim } from './crud.js';

export default crudRouter({
  table: 'faculty',
  fields: { name: 'name', email: 'email', department: 'department', designation: 'designation', available: 'available' },
  select: 'id, name, email, department, designation, available',
  defaults: { available: true },
  conflict: { key: 'email', column: 'email' },
  normalize: (b) => ({
    ...b,
    name: trim(b.name),
    email: typeof b.email === 'string' ? b.email.trim().toLowerCase() : b.email,
    department: trim(b.department),
    designation: isBlank(b.designation) ? null : trim(b.designation),
  }),
  validate: (b) => {
    if (isBlank(b.name) || isBlank(b.email) || isBlank(b.department)) {
      return 'Name, email and department are required';
    }
    if (!String(b.email).includes('@')) return 'Enter a valid email';
    return null;
  },
});
