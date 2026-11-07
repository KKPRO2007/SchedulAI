export type Faculty = {
  id: number;
  name: string;
  email: string;
  department: string;
  designation?: string | null;
  available: boolean;
};

export type RoomType = 'Classroom' | 'Laboratory' | 'Seminar Hall';

export type Room = {
  id: number;
  name: string;
  building: string;
  type: RoomType;
  capacity: number;
  available: boolean;
};

export type Section = {
  id: number;
  name: string;
  department: string;
  semester: number;
  students: number;
  shift: string;
};

export type Subject = {
  id: number;
  code: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  weeklyHours: number;
};

export type EntityKey = 'faculty' | 'rooms' | 'sections' | 'subjects';

export type EntityMap = {
  faculty: Faculty;
  rooms: Room;
  sections: Section;
  subjects: Subject;
};

export type Stats = Record<EntityKey, number>;

export type BulkResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { index: number; error: string }[];
};
