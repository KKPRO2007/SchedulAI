// One demo account per role in the synopsis (Fig. 1). Mirrors backend/src/routes/auth.js.
export type Role = 'admin' | 'coordinator' | 'faculty' | 'student';
export type User = { email: string; name: string; role: Role; title?: string; section?: string };

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  coordinator: 'Coordinator',
  faculty: 'Faculty',
  student: 'Student',
};

export const DEMO_ACCOUNTS: (User & { password: string; blurb: string })[] = [
  {
    email: 'admin@schedulai.app',
    password: 'admin123',
    name: 'Aditi Rao',
    role: 'admin',
    title: 'Administrator',
    blurb: 'Approves and publishes versions, manages master data and reads the audit log.',
  },
  {
    email: 'coordinator@schedulai.app',
    password: 'coord123',
    name: 'Rahul Verma',
    role: 'coordinator',
    title: 'Timetable Coordinator',
    blurb: 'Imports data, generates and compares candidates, handles substitutions.',
  },
  {
    email: 'faculty@schedulai.app',
    password: 'faculty123',
    name: 'Dr. Priya Sharma',
    role: 'faculty',
    title: 'Associate Professor · Computer Science',
    blurb: 'Sees their week, sets a preferred teaching window, raises change requests.',
  },
  {
    email: 'student@schedulai.app',
    password: 'student123',
    name: 'Ananya Gupta',
    role: 'student',
    title: 'Student · CSE-5A',
    section: 'CSE-5A',
    blurb: 'Read-only view of the published timetable for their section.',
  },
];

/** Same accounts, used when no backend is reachable. */
export function checkDemoLogin(email: string, password: string): User | null {
  const e = email.trim().toLowerCase();
  if (e === 'demo@schedulai.app' && password === 'demo1234') return strip(DEMO_ACCOUNTS[0]);
  const a = DEMO_ACCOUNTS.find((x) => x.email === e && x.password === password);
  return a ? strip(a) : null;
}

function strip(a: (typeof DEMO_ACCOUNTS)[number]): User {
  return { email: a.email, name: a.name, role: a.role, title: a.title, section: a.section };
}

export const isStaff = (role: Role) => role === 'admin' || role === 'coordinator';
