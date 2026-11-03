import { crudRouter, isBlank } from './crud.js';

export default crudRouter({
  table: 'faculty',
  fields: { name: 'name', email: 'email', department: 'department', available: 'available' },
  select: 'id, name, email, department, available',
  defaults: { available: true },
  validate: (b) => {
    if (isBlank(b.name) || isBlank(b.email) || isBlank(b.department)) {
      return 'Name, email and department are required';
    }
    if (!String(b.email).includes('@')) return 'Enter a valid email';
    return null;
  },
});