import express from 'express';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import { pool } from './db.js';
import facultyRoutes from './routes/faculty.js';
import roomsRoutes from './routes/rooms.js';
import statsRoutes from './routes/stats.js';
import sectionsRoutes from './routes/sections.js';
import subjectsRoutes from './routes/subjects.js';
import authRoutes from './routes/auth.js';
import versionsRoutes from './routes/versions.js';
import requestsRoutes from './routes/requests.js';
import auditRoutes from './routes/audit.js';

dotenv.config({ quiet: true });

// Create tables once per process (or per serverless cold start).
const schema = fs.readFileSync(new URL('../sql/schema.sql', import.meta.url), 'utf8');
let schemaReady = null;
function ensureSchema() {
  schemaReady ??= pool.query(schema).catch((err) => {
    schemaReady = null; // retry on the next request
    throw err;
  });
  return schemaReady;
}

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await ensureSchema();
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Everything below needs the database tables.
app.use('/api', async (req, res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/versions', versionsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/subjects', subjectsRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err.code === '23514' || err.code === '23502' || err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
