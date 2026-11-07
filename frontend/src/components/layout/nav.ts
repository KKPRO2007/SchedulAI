import { BookOpen, CalendarDays, CalendarHeart, DoorOpen, GraduationCap, LayoutDashboard, Settings, UploadCloud, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '../../lib/demoAccounts';

export type PageId = 'overview' | 'schedule' | 'import' | 'timetable' | 'faculty' | 'rooms' | 'sections' | 'subjects' | 'settings';

type NavItem = { id: PageId; label: string; icon: LucideIcon; badge?: string; group: 'Workspace' | 'Data' | 'System'; roles: Role[] };

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace', roles: ['admin'] },
  { id: 'schedule', label: 'My Schedule', icon: CalendarHeart, group: 'Workspace', roles: ['faculty'] },
  { id: 'import', label: 'Data Import', icon: UploadCloud, badge: 'AI', group: 'Workspace', roles: ['admin'] },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays, group: 'Workspace', roles: ['admin', 'faculty'] },
  { id: 'faculty', label: 'Faculty', icon: Users, group: 'Data', roles: ['admin', 'faculty'] },
  { id: 'rooms', label: 'Rooms & Labs', icon: DoorOpen, group: 'Data', roles: ['admin', 'faculty'] },
  { id: 'sections', label: 'Sections', icon: GraduationCap, group: 'Data', roles: ['admin', 'faculty'] },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, group: 'Data', roles: ['admin', 'faculty'] },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'System', roles: ['admin'] },
];

export const navFor = (role: Role) => NAV.filter((n) => n.roles.includes(role));
export const homeFor = (role: Role): PageId => (role === 'faculty' ? 'schedule' : 'overview');

export const PAGE_SUBTITLE: Record<PageId, string> = {
  overview: 'Your campus at a glance',
  schedule: 'Your classes for the week',
  import: 'Turn any spreadsheet into records',
  timetable: 'Generate and explore the weekly schedule',
  faculty: 'People who teach',
  rooms: 'Classrooms, labs and halls',
  sections: 'Student groups and shifts',
  subjects: 'What gets taught, and for how long',
  settings: 'Workspace and demo data',
};
