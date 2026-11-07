import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/** Append an audit entry. Never stores secrets or file contents, only the event and actor. */
export async function audit(user, action, detail) {
  await pool.query('INSERT INTO audit_log (actor, role, action, detail) VALUES ($1, $2, $3, $4)', [
    user?.email ?? 'system',
    user?.role ?? 'system',
    String(action).slice(0, 60),
    detail ? String(detail).slice(0, 1000) : null,
  ]);
}

const router = Router();
router.use(requireAuth);

router.get('/', requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, actor, role, action, detail, created_at AS "createdAt" FROM audit_log ORDER BY id DESC LIMIT 300'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Client-side events worth recording (imports, generation runs, exports).
router.post('/', async (req, res, next) => {
  const action = String(req.body?.action ?? '').trim();
  if (!action) return res.status(400).json({ error: 'action is required' });
  try {
    await audit(req.user, action, req.body?.detail);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
