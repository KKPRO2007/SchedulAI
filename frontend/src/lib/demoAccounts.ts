export type Role = 'admin' | 'faculty';
export type User = { email: string; name: string; role: Role; title?: string };

export const DEMO_ACCOUNTS: (User & { password: string; blurb: string })[] = [
  {
    email: 'admin@schedulai.app',
    password: 'admin123',
    name: 'Aditi Rao',
    role: 'admin',
    title: 'Academic Administrator',
    blurb: 'Import data, manage the campus and generate timetables.',
  },
  {
    email: 'faculty@schedulai.app',
    password: 'faculty123',
    name: 'Dr. Priya Sharma',
    role: 'faculty',
    title: 'Associate Professor · Computer Science',
    blurb: 'See your own week, today’s classes and download your schedule.',
  },
];

/** Same accounts, used when no backend is reachable. */
export function checkDemoLogin(email: string, password: string): User | null {
  const e = email.trim().toLowerCase();
  if (e === 'demo@schedulai.app' && password === 'demo1234') return { ...strip(DEMO_ACCOUNTS[0]) };
  const a = DEMO_ACCOUNTS.find((x) => x.email === e && x.password === password);
  return a ? strip(a) : null;
}

function strip(a: (typeof DEMO_ACCOUNTS)[number]): User {
  return { email: a.email, name: a.name, role: a.role, title: a.title };
}

