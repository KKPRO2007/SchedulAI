import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from './audit.js';

// Change and substitution requests (synopsis §8.3).
const TYPES = ['leave', 'substitution', 'room', 'availability', 'other'];
const SELECT = `id, type, title, details, priority, status, requested_by AS "requestedBy", requester_role AS "requesterRole",
  payload, resolution, resolved_by AS "resolvedBy", resolved_at AS "resolvedAt", created_at AS "createdAt"`;

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const staff = ['admin', 'coordinator'].includes(req.user.role);
    const { rows } = staff
      ? await pool.query(`SELECT ${SELECT} FROM change_requests ORDER BY (status = 'pending') DESC, id DESC LIMIT 200`)
      : await pool.query(`SELECT ${SELECT} FROM change_requests WHERE requested_by = $1 ORDER BY id DESC`, [req.user.email]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin', 'coordinator', 'faculty'), async (req, res, next) => {
  const { type, title, details, priority, payload } = req.body ?? {};
  if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of ${TYPES.join(', ')}` });
  if (!title || String(title).trim().length < 3) return res.status(400).json({ error: 'Please add a short title' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO change_requests (type, title, details, priority, requested_by, requester_role, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${SELECT}`,
      [type, String(title).slice(0, 200), details ?? null, ['low', 'normal', 'high'].includes(priority) ? priority : 'normal', req.user.email, req.user.role, payload ?? null]
    );
    await audit(req.user, 'raised request', `#${rows[0].id} ${rows[0].title}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resolve', requireRole('admin', 'coordinator'), async (req, res, next) => {
  const status = req.body?.status;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });
  try {
    const { rows } = await pool.query(
      `UPDATE change_requests SET status = $1, resolution = $2, resolved_by = $3, resolved_at = NOW()
       WHERE id = $4 AND status = 'pending' RETURNING ${SELECT}`,
      [status, req.body?.resolution ?? null, req.user.email, req.params.id]
    );
    if (!rows[0]) return res.status(409).json({ error: 'Request not found or already resolved' });
    await audit(req.user, `request ${status}`, `#${rows[0].id} ${rows[0].title}`);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
