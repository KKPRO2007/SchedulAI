import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { answerQuestion } from "../services/aiService.js";
import { scopeSessions } from "../services/timetableContext.js";
import { DEMO_ACCOUNTS } from "./auth.js";
import { pool } from "../db.js";

const router = Router();
const MAX_QUESTION_LENGTH = 500;

router.use(requireAuth);

/** Tokens issued before sections were added to the JWT fall back to the demo account list. */
function withSection(user) {
    if (user.role !== 'student' || user.section) return user;
    const account = DEMO_ACCOUNTS.find((a) => a.email === String(user.email).toLowerCase());
    return { ...user, section: account?.section };
}

router.post("/ask", async (req, res) => {
    try {
        const { question } = req.body ?? {};

        if (typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({ error: "Question is required" });
        }
        if (question.length > MAX_QUESTION_LENGTH) {
            return res.status(400).json({ error: `Please keep questions under ${MAX_QUESTION_LENGTH} characters` });
        }

        const result = await pool.query(`
            SELECT payload
            FROM timetable_versions
            WHERE status = 'published'
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.json({ answer: "No published timetable found.", provider: 'none' });
        }

        const allSessions = result.rows[0].payload?.sessions || [];
        const user = withSection(req.user);
        const sessions = scopeSessions(allSessions, user);

        if (user.role === 'student' && !user.section) {
            return res.json({ answer: "I couldn't find your section. Please sign out and sign in again.", provider: 'none' });
        }

        const rooms = await pool
            .query(`SELECT name, type, capacity FROM rooms WHERE available = TRUE ORDER BY name`)
            .then((r) => r.rows)
            .catch(() => []);

        const { answer, provider, intent } = await answerQuestion({ question, sessions, allSessions, rooms, user });

        res.json({ answer, provider, intent });
    } catch (error) {
        console.error("AI Assistant Error:", error);

        res.status(500).json({ error: "Something went wrong" });
    }
});

export default router;
