import { pool } from '../db.js';
import { crudRouter, isBlank, trim } from './crud.js';
import { requireRole } from '../middleware/auth.js';
import { audit } from './audit.js';

const WINDOWS = ['any', 'morning', 'afternoon'];

const router = crudRouter({
  table: 'faculty',
  fields: {
    name: 'name', email: 'email', department: 'department', designation: 'designation',
    available: 'available', maxWorkload: 'max_workload', preferredWindow: 'preferred_window',
  },
  select: 'id, name, email, department, designation, available, max_workload AS "maxWorkload", preferred_window AS "preferredWindow"',
  defaults: { available: true, maxWorkload: 18, preferredWindow: 'any' },
  conflict: { key: 'email', column: 'email' },
  normalize: (b) => ({
    ...b,
    name: trim(b.name),
    email: typeof b.email === 'string' ? b.email.trim().toLowerCase() : b.email,
    department: trim(b.department),
    designation: isBlank(b.designation) ? null : trim(b.designation),
    maxWorkload: isBlank(b.maxWorkload) ? 18 : Number(b.maxWorkload),
    preferredWindow: WINDOWS.includes(b.preferredWindow) ? b.preferredWindow : 'any',
  }),
  validate: (b) => {
    if (isBlank(b.name) || isBlank(b.email) || isBlank(b.department)) {
      return 'Name, email and department are required';
    }
    if (!String(b.email).includes('@')) return 'Enter a valid email';
    if (!(b.maxWorkload >= 1 && b.maxWorkload <= 40)) return 'Max workload must be 1 to 40 hours';
    return null;
  },
});

// Faculty members declare their own preferred teaching window (synopsis §10.2).
router.patch('/me/preferences', requireRole('faculty'), async (req, res, next) => {
  const preferredWindow = req.body?.preferredWindow;
  if (!WINDOWS.includes(preferredWindow)) return res.status(400).json({ error: `preferredWindow must be ${WINDOWS.join(', ')}` });
  try {
    const { rows } = await pool.query(
      'UPDATE faculty SET preferred_window = $1 WHERE email = $2 RETURNING id, name, email, preferred_window AS "preferredWindow"',
      [preferredWindow, req.user.email]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No faculty record matches your account' });
    await audit(req.user, 'updated preferences', `preferred window: ${preferredWindow}`);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
