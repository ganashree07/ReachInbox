import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender       TEXT NOT NULL,
      recipient    TEXT NOT NULL,
      subject      TEXT NOT NULL,
      body         TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'scheduled',
      scheduled_at TIMESTAMPTZ NOT NULL,
      sent_at      TIMESTAMPTZ,
      preview_url  TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ DB ready');
}
