import { Router } from 'express';
import crypto from 'crypto';

// Free demo logins: one admin, one faculty member. Real accounts + JWT will replace this later.
export const DEMO_ACCOUNTS = [
  { email: 'admin@schedulai.app', password: 'admin123', name: 'Aditi Rao', role: 'admin', title: 'Academic Administrator' },
  { email: 'faculty@schedulai.app', password: 'faculty123', name: 'Dr. Priya Sharma', role: 'faculty', title: 'Associate Professor · Computer Science' },
  // older demo login kept working
  { email: 'demo@schedulai.app', password: 'demo1234', name: 'Aditi Rao', role: 'admin', title: 'Academic Administrator' },
];

const router = Router();

router.post('/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const account = DEMO_ACCOUNTS.find((a) => a.email === email && a.password === password);
  if (!account) return res.status(401).json({ error: 'Invalid email or password' });

  const { password: _omit, ...user } = account;
  res.json({ token: crypto.randomBytes(24).toString('hex'), user });
});

export default router;
