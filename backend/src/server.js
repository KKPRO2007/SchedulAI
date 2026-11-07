import app from './app.js';

// Local development server. On Vercel the same app runs from /api/index.js.
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`SchedulAI API running on http://localhost:${port}`);
});
