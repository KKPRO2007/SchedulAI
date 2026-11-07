import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Hosted Postgres (Neon / Vercel) needs SSL; a local database usually doesn't.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocal = !url || /localhost|127\.0\.0\.1/.test(url);

export const pool = new pg.Pool({
  connectionString: url,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 10_000,
});
