import { crudRouter, isBlank, isPositive, trim } from './crud.js';

const TYPES = ['Classroom', 'Laboratory', 'Seminar Hall'];

export default crudRouter({
  table: 'rooms',
  fields: { name: 'name', building: 'building', type: 'type', capacity: 'capacity', available: 'available' },
  select: 'id, name, building, type, capacity, available',
  defaults: { available: true },
  conflict: { key: 'name', column: 'name' },
  normalize: (b) => ({ ...b, name: trim(b.name), building: trim(b.building) }),
  validate: (b) => {
    if (isBlank(b.name) || isBlank(b.building)) return 'Name and building are required';
    if (!TYPES.includes(b.type)) return 'Room type must be Classroom, Laboratory or Seminar Hall';
    if (!isPositive(b.capacity)) return 'Capacity must be greater than 0';
    return null;
  },
});
