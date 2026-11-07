import {
  BookOpen,
  CalendarDays,
  CalendarHeart,
  DoorOpen,
  GitPullRequestArrow,
  GraduationCap,
  History,
  LayoutDashboard,
  ScrollText,
  Settings,
  Sparkles,
  UploadCloud,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../../lib/demoAccounts';

export type PageId =
  | 'overview'
  | 'schedule'
  | 'my-timetable'
  | 'import'
  | 'studio'
  | 'versions'
  | 'timetable'
  | 'requests'
  | 'faculty'
  | 'rooms'
  | 'sections'
  | 'subjects'
  | 'audit'
  | 'settings';

type Group = 'Workspace' | 'Scheduling' | 'Master data' | 'System';
type NavItem = { id: PageId; label: string; icon: LucideIcon; badge?: string; group: Group; roles: Role[] };

const STAFF: Role[] = ['admin', 'coordinator'];

export const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Workspace', roles: STAFF },
  { id: 'schedule', label: 'My Schedule', icon: CalendarHeart, group: 'Workspace', roles: ['faculty'] },
  { id: 'my-timetable', label: 'My Timetable', icon: CalendarHeart, group: 'Workspace', roles: ['student'] },
  { id: 'import', label: 'Data Import', icon: UploadCloud, badge: 'AI', group: 'Workspace', roles: STAFF },
  { id: 'studio', label: 'Generate', icon: Sparkles, group: 'Scheduling', roles: STAFF },
  { id: 'versions', label: 'Versions & Approval', icon: History, group: 'Scheduling', roles: STAFF },
  { id: 'timetable', label: 'Published Timetable', icon: CalendarDays, group: 'Scheduling', roles: ['admin', 'coordinator', 'faculty', 'student'] },
  { id: 'requests', label: 'Change Requests', icon: GitPullRequestArrow, group: 'Scheduling', roles: ['admin', 'coordinator', 'faculty'] },
  { id: 'faculty', label: 'Faculty', icon: Users, group: 'Master data', roles: ['admin', 'coordinator', 'faculty'] },
  { id: 'rooms', label: 'Rooms & Labs', icon: DoorOpen, group: 'Master data', roles: ['admin', 'coordinator', 'faculty', 'student'] },
  { id: 'sections', label: 'Sections', icon: GraduationCap, group: 'Master data', roles: ['admin', 'coordinator', 'faculty'] },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, group: 'Master data', roles: ['admin', 'coordinator', 'faculty', 'student'] },
  { id: 'audit', label: 'Audit Log', icon: ScrollText, group: 'System', roles: STAFF },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'System', roles: ['admin'] },
];

export const GROUPS: Group[] = ['Workspace', 'Scheduling', 'Master data', 'System'];

export const navFor = (role: Role) => NAV.filter((n) => n.roles.includes(role));
export const homeFor = (role: Role): PageId => (role === 'faculty' ? 'schedule' : role === 'student' ? 'my-timetable' : 'overview');

export const PAGE_SUBTITLE: Record<PageId, string> = {
  overview: 'Data quality, workflow status and today at a glance',
  schedule: 'Your classes, preferences and requests',
  'my-timetable': 'Your section’s published timetable',
  import: 'Excel / CSV / ODS / JSON with column mapping and preview',
  studio: 'Generate, score and compare candidate timetables',
  versions: 'Draft → Submitted → Approved → Published',
  timetable: 'The approved timetable everyone sees',
  requests: 'Leave, substitution and change requests',
  faculty: 'People who teach',
  rooms: 'Classrooms, labs and halls',
  sections: 'Student groups and shifts',
  subjects: 'What gets taught, and for how long',
  audit: 'Who changed what, and when',
  settings: 'Workspace and demo data',
};
