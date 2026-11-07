import { Router } from 'express';
import { signToken } from '../middleware/auth.js';
import { audit } from './audit.js';

// Demo accounts, one per role in the synopsis (Fig. 1). Real accounts can replace this list later.
export const DEMO_ACCOUNTS = [
  { email: 'admin@schedulai.app', password: 'admin123', name: 'Aditi Rao', role: 'admin', title: 'Administrator' },
  { email: 'coordinator@schedulai.app', password: 'coord123', name: 'Rahul Verma', role: 'coordinator', title: 'Timetable Coordinator' },
  { email: 'faculty@schedulai.app', password: 'faculty123', name: 'Dr. Priya Sharma', role: 'faculty', title: 'Associate Professor · Computer Science' },
  { email: 'student@schedulai.app', password: 'student123', name: 'Ananya Gupta', role: 'student', title: 'Student · CSE-5A', section: 'CSE-5A' },
  // older demo login kept working
  { email: 'demo@schedulai.app', password: 'demo1234', name: 'Aditi Rao', role: 'admin', title: 'Administrator' },
];

const router = Router();

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const account = DEMO_ACCOUNTS.find((a) => a.email === email && a.password === password);
  if (!account) return res.status(401).json({ error: 'Invalid email or password' });

  const { password: _omit, ...user } = account;
  await audit({ email: user.email, role: user.role }, 'signed in', null).catch(() => {});
  res.json({ token: signToken(user), user });
});

export default router;
