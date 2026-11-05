import express from 'express';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import { pool } from './db.js';
import facultyRoutes from './routes/faculty.js';
import roomsRoutes from './routes/rooms.js';
import sectionsRoutes from './routes/sections.js';
import subjectsRoutes from './routes/subjects.js';

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/faculty', facultyRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/subjects', subjectsRoutes);

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

const schema = fs.readFileSync(new URL('../sql/schema.sql', import.meta.url), 'utf8');
await pool.query(schema).catch((err) => console.error('Schema setup failed:', err.message));

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`SchedulAI API running on http://localhost:${port}`);
});