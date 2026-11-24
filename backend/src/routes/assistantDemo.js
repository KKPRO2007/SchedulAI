import { Router } from 'express';
import { answerQuestion } from '../services/aiService.js';
import { scopeSessions } from '../services/timetableContext.js';

// Assistant for the browser-only demo mode (no database). The browser sends the published
// timetable it holds locally; the server scopes it by role and runs the same pipeline.
// It needs no database, so it is mounted before the database middleware.

const router = Router();

const MAX_QUESTION_LENGTH = 500;
const MAX_SESSIONS = 2000;
const MAX_ROOMS = 300;
const ROLES = new Set(['admin', 'coordinator', 'faculty', 'student']);
const RATE_LIMIT = 30; // requests per IP per minute (per serverless instance)
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

const str = (value, max = 160) => (typeof value === 'string' ? value.slice(0, max) : '');

function cleanSession(s) {
  if (!s || typeof s !== 'object') return null;
  const start = Number(s.start);
  const duration = Number(s.duration);
  if (!Number.isFinite(start) || start < 0 || start > 23) return null;
  return {
    day: str(s.day, 12),
    start,
    duration: Number.isFinite(duration) && duration > 0 && duration <= 6 ? duration : 1,
    section: str(s.section, 40),
    shift: str(s.shift, 20),
    department: str(s.department, 80),
    subjectCode: str(s.subjectCode, 20),
    subjectName: str(s.subjectName, 120),
    faculty: str(s.faculty, 120),
    facultyEmail: str(s.facultyEmail, 160),
    room: str(s.room, 60),
    isLab: Boolean(s.isLab),
  };
}

function cleanRoom(r) {
  if (!r || typeof r !== 'object' || !str(r.name)) return null;
  const capacity = Number(r.capacity);
  return { name: str(r.name, 60), type: str(r.type, 30), capacity: Number.isFinite(capacity) ? capacity : undefined };
}

router.post('/', async (req, res) => {
  try {
    if (rateLimited(req.ip ?? 'unknown')) {
      return res.status(429).json({ error: 'Too many questions. Please wait a minute and try again.' });
    }
    const { question, history, sessions, rooms, user } = req.body ?? {};
    if (typeof question !== 'string' || !question.trim()) return res.status(400).json({ error: 'Question is required' });
    if (question.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ error: `Please keep questions under ${MAX_QUESTION_LENGTH} characters` });
    }
    if (!Array.isArray(sessions) || sessions.length > MAX_SESSIONS) {
      return res.status(400).json({ error: 'A published timetable is required' });
    }
    if (!user || !ROLES.has(user.role)) return res.status(400).json({ error: 'A demo user is required' });

    const viewer = { role: user.role, name: str(user.name, 80), email: str(user.email), section: str(user.section, 40) || undefined };
    const allSessions = sessions.map(cleanSession).filter(Boolean);
    const roomList = Array.isArray(rooms) ? rooms.slice(0, MAX_ROOMS).map(cleanRoom).filter(Boolean) : [];
    const scoped = scopeSessions(allSessions, viewer);

    const { answer, provider, intent } = await answerQuestion({
      question, sessions: scoped, allSessions, rooms: roomList, user: viewer, history,
    });
    res.json({ answer, provider, intent });
  } catch (error) {
    console.error('AI Assistant (demo) Error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
