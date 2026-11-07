import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from './audit.js';

// Timetable version lifecycle (synopsis Fig. 6):
// draft -> submitted -> approved -> published, with rejected/archived side states.
// A published timetable is never overwritten; publishing a new one archives the old one.

const SUMMARY = `id, label, status, score, note, created_by AS "createdBy", reviewed_by AS "reviewedBy",
  reviewed_at AS "reviewedAt", published_at AS "publishedAt", created_at AS "createdAt",
  jsonb_array_length(payload->'sessions') AS sessions`;
const FULL = `${SUMMARY}, payload`;

// who may move a version from one state to another
const TRANSITIONS = {
  submitted: { from: ['draft', 'rejected'], roles: ['admin', 'coordinator'] },
  approved: { from: ['submitted'], roles: ['admin'] },
  rejected: { from: ['submitted'], roles: ['admin'] },
  published: { from: ['approved', 'archived'], roles: ['admin'] },
  draft: { from: ['rejected'], roles: ['admin', 'coordinator'] },
};

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const staff = ['admin', 'coordinator'].includes(req.user.role);
    // faculty and students only ever see what has been published
    const { rows } = await pool.query(
      `SELECT ${SUMMARY} FROM timetable_versions ${staff ? '' : "WHERE status IN ('published', 'archived')"} ORDER BY id DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/published', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${FULL} FROM timetable_versions WHERE status = 'published' ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1`);
    res.json(rows[0] ?? null);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${FULL} FROM timetable_versions WHERE id = $1`, [req.params.id]);
    const v = rows[0];
    if (!v) return res.status(404).json({ error: 'Not found' });
    const staff = ['admin', 'coordinator'].includes(req.user.role);
    if (!staff && !['published', 'archived'].includes(v.status)) return res.status(403).json({ error: 'Not published yet' });
    res.json(v);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('admin', 'coordinator'), async (req, res, next) => {
  const { label, payload, score, note } = req.body ?? {};
  if (!label || !payload || !Array.isArray(payload.sessions)) return res.status(400).json({ error: 'label and payload.sessions are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO timetable_versions (label, payload, score, note, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING ${SUMMARY}`,
      [String(label).slice(0, 120), payload, score ?? null, note ?? null, req.user.email]
    );
    await audit(req.user, 'created draft', `${rows[0].label} (#${rows[0].id})`);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/transition', async (req, res, next) => {
  const to = String(req.body?.to ?? '');
  const rule = TRANSITIONS[to];
  if (!rule) return res.status(400).json({ error: 'Unknown status' });
  if (!rule.roles.includes(req.user.role)) return res.status(403).json({ error: `Only ${rule.roles.join(' or ')} can mark a version ${to}` });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, label, status FROM timetable_versions WHERE id = $1 FOR UPDATE', [req.params.id]);
    const v = rows[0];
    if (!v) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    if (!rule.from.includes(v.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `A ${v.status} version cannot become ${to}` });
    }
    if (to === 'published') {
      await client.query(`UPDATE timetable_versions SET status = 'archived' WHERE status = 'published'`);
    }
    const reviewed = ['approved', 'rejected', 'published'].includes(to);
    const { rows: updated } = await client.query(
      `UPDATE timetable_versions SET status = $1,
         note = COALESCE($2, note),
         reviewed_by = CASE WHEN $3 THEN $4 ELSE reviewed_by END,
         reviewed_at = CASE WHEN $3 THEN NOW() ELSE reviewed_at END,
         published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END
       WHERE id = $5 RETURNING ${SUMMARY}`,
      [to, req.body?.note ?? null, reviewed, req.user.email, v.id]
    );
    await client.query('COMMIT');
    await audit(req.user, `version ${to}`, `${v.label} (#${v.id})${req.body?.note ? ` · ${req.body.note}` : ''}`);
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

export default router;
