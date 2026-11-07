export type Faculty = {
  id: number;
  name: string;
  email: string;
  department: string;
  designation?: string | null;
  available: boolean;
  maxWorkload?: number;
  preferredWindow?: PreferredWindow;
};

export type PreferredWindow = 'any' | 'morning' | 'afternoon';

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

export type VersionStatus = 'draft' | 'submitted' | 'approved' | 'published' | 'archived' | 'rejected';

export type ScoreComponent = { key: string; label: string; weight: number; value: number; note: string };
export type ScoreReport = { total: number; components: ScoreComponent[]; hardPassed: number; hardTotal: number; strategy?: string };

export type VersionSummary = {
  id: number;
  label: string;
  status: VersionStatus;
  score: ScoreReport | null;
  note: string | null;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  sessions: number;
};

export type ChangeRequest = {
  id: number;
  type: 'leave' | 'substitution' | 'room' | 'availability' | 'other';
  title: string;
  details: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requesterRole: string;
  payload: Record<string, unknown> | null;
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type AuditEntry = { id: number; actor: string; role: string; action: string; detail: string | null; createdAt: string };
