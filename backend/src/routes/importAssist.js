import { Router } from 'express';
import { cleanMappingRequest, suggestColumnMapping } from '../services/columnMapping.js';

// AI column mapping for the data import. Needs no database (the browser sends only
// headers and a few sample values), so it is mounted before the database middleware
// and works in the browser-only demo mode too.

const router = Router();
const RATE_LIMIT = 20; // requests per IP per minute (per serverless instance)
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

router.post('/map-columns', async (req, res) => {
  try {
    if (rateLimited(req.ip ?? 'unknown')) {
      return res.status(429).json({ error: 'Too many mapping requests. Please wait a minute and try again.' });
    }
    const request = cleanMappingRequest(req.body);
    if (!request) return res.status(400).json({ error: 'Headers and a field catalog are required' });

    const result = await suggestColumnMapping(request);
    if (!result) return res.status(503).json({ error: 'AI mapping is not available right now. You can still choose the sheet type manually.' });
    res.json(result);
  } catch (error) {
    console.error('Import mapping error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
