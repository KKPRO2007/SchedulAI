import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM faculty)::int  AS faculty,
        (SELECT COUNT(*) FROM rooms)::int    AS rooms,
        (SELECT COUNT(*) FROM sections)::int AS sections,
        (SELECT COUNT(*) FROM subjects)::int AS subjects
    `);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;