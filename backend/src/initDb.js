import fs from 'fs';
import { pool } from './db.js';

const sql = fs.readFileSync(new URL('../sql/schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(sql);
  console.log('Tables created successfully');
} catch (err) {
  console.error('Database setup failed:', err.message);
} finally {
  await pool.end();
}