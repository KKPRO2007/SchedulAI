
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateAIResponse } from "../services/aiService.js";
import { pool } from "../db.js";

const router = Router();

router.use(requireAuth);

router.post("/ask", async (req, res) => {
    try {
        const { question } = req.body;

        if (typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({
                error: "Question is required"
            });
        }

        const result = await pool.query(`
            SELECT payload
            FROM timetable_versions
            WHERE status = 'published'
            ORDER BY created_at DESC
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.json({
                answer: "No published timetable found."
            });
        }

        let sessions = result.rows[0].payload.sessions || [];

        const user = req.user;

        if (user.role === "faculty") {
            sessions = sessions.filter(
                session => session.facultyEmail?.toLowerCase() === user.email.toLowerCase()
            );
        }

        const answer = generateAIResponse(question, sessions);

        res.json({ answer });

    } catch (error) {
        console.error("AI Assistant Error:", error);

        res.status(500).json({
            error: "Something went wrong"
        });
    }
});

export default router;
