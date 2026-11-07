import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const BULK_CHUNK = 500;

export function crudRouter({ table, fields, select, defaults = {}, validate, conflict, normalize = (b) => b }) {
  const router = Router();
  const apiKeys = Object.keys(fields);
  const dbCols = Object.values(fields);
  const getValues = (body) => apiKeys.map((k) => body[k] ?? defaults[k] ?? null);

  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT ${select} FROM ${table} ORDER BY id`);
      res.json(rows);
    } catch (err) { next(err); }
  });

  router.post('/', requireRole('admin', 'coordinator'), async (req, res, next) => {
    const body = normalize(req.body ?? {});
    const error = validate(body);
    if (error) return res.status(400).json({ error });
    try {
      const values = getValues(body);
      const marks = values.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO ${table} (${dbCols.join(', ')}) VALUES (${marks}) RETURNING ${select}`,
        values
      );
      res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  });

  // Bulk upsert used by the file importer. Rows are validated one by one,
  // de-duplicated on the unique key, then written in chunks inside one transaction.
  router.post('/bulk', requireRole('admin', 'coordinator'), async (req, res, next) => {
    const input = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!input) return res.status(400).json({ error: 'Expected { rows: [...] }' });
    if (input.length > 20000) return res.status(413).json({ error: 'Too many rows (max 20000)' });

    const errors = [];
    const unique = new Map();
    input.forEach((raw, index) => {
      const row = normalize(raw ?? {});
      const error = validate(row);
      if (error) {
        errors.push({ index, error });
        return;
      }
      unique.set(String(row[conflict.key]).trim().toLowerCase(), row);
    });

    const rows = [...unique.values()];
    let inserted = 0;
    let updated = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // replace: start fresh, used when importing a complete dataset
      if (req.body.replace === true) await client.query(`DELETE FROM ${table}`);
      const updates = dbCols
        .filter((c) => c !== conflict.column)
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(', ');
      for (let start = 0; start < rows.length; start += BULK_CHUNK) {
        const chunk = rows.slice(start, start + BULK_CHUNK);
        const params = [];
        const tuples = chunk.map((row) => {
          const marks = getValues(row).map((v) => {
            params.push(v);
            return `$${params.length}`;
          });
          return `(${marks.join(', ')})`;
        });
        const { rows: result } = await client.query(
          `INSERT INTO ${table} (${dbCols.join(', ')}) VALUES ${tuples.join(', ')}
           ON CONFLICT (${conflict.column}) DO UPDATE SET ${updates}
           RETURNING (xmax = 0) AS inserted`,
          params
        );
        result.forEach((r) => (r.inserted ? inserted++ : updated++));
      }
      await client.query('COMMIT');
      res.json({ inserted, updated, skipped: input.length - rows.length - errors.length, errors });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      next(err);
    } finally {
      client.release();
    }
  });

  router.put('/:id', requireRole('admin', 'coordinator'), async (req, res, next) => {
    const body = normalize(req.body ?? {});
    const error = validate(body);
    if (error) return res.status(400).json({ error });
    try {
      const values = getValues(body);
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
export const trim = (v) => (typeof v === 'string' ? v.trim() : v);
