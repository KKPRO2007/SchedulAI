import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export function crudRouter({ table, fields, select, defaults = {}, validate }) {
  const router = Router();
  const apiKeys = Object.keys(fields);
  const dbCols = Object.values(fields);
  const getValues = (body) => apiKeys.map((k) => body[k] ?? defaults[k]);

  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT ${select} FROM ${table} ORDER BY id`);
      res.json(rows);
    } catch (err) { next(err); }
  });

  router.post('/', requireRole('admin', 'coordinator'), async (req, res, next) => {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });
    try {
      const values = getValues(req.body);
      const marks = values.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${dbCols.join(', ')}) VALUES (${marks}) RETURNING ${select}`,
        values
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  });

  router.put('/:id', requireRole('admin', 'coordinator'), async (req, res, next) => {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });
    try {
      const values = getValues(req.body);
      const sets = dbCols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `UPDATE ${table} SET ${sets} WHERE id = $${values.length + 1} RETURNING ${select}`,
        [...values, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (err) { next(err); }
  });

  router.delete('/:id', requireRole('admin', 'coordinator'), async (req, res, next) => {
    try {
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    } catch (err) { next(err); }
  });

  return router;
}

export const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';
export const isPositive = (v) => Number(v) > 0;
