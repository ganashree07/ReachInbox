import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db';
import { emailQueue } from '../queue';
import { ScheduleRequestBody, JobData } from '../types';

const router = Router();

// POST /api/emails/schedule
router.post('/schedule', async (req: Request, res: Response) => {
  const {
    sender,
    recipients,
    subject,
    body,
    scheduledAt,
    delayBetweenMs = 2000,
  } = req.body as ScheduleRequestBody;

  if (!sender || !recipients?.length || !subject || !body || !scheduledAt) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const scheduleTime = new Date(scheduledAt);
  if (isNaN(scheduleTime.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduledAt' });
  }

  const now = Date.now();
  const results: { emailId: string; recipient: string }[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i].trim();
    if (!recipient) continue;

    const emailId = uuidv4();
    const jobDelay = Math.max(0, scheduleTime.getTime() - now) + i * delayBetweenMs;

    // 1. Persist to DB first
    await pool.query(
      `INSERT INTO emails (id, sender, recipient, subject, body, status, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)`,
      [emailId, sender, recipient, subject, body, scheduleTime]
    );

    // 2. Enqueue BullMQ delayed job — jobId = emailId for dedup
    const jobData: JobData = { emailId, sender, recipient, subject, body };
    await emailQueue.add('sendEmail', jobData, {
      jobId: emailId,
      delay: jobDelay,
    });

    results.push({ emailId, recipient });
  }

  return res.json({ scheduled: results.length, jobs: results });
});

// GET /api/emails?status=scheduled|sent&page=1&limit=50
router.get('/', async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const page   = parseInt(req.query.page as string || '1');
  const limit  = parseInt(req.query.limit as string || '50');
  const offset = (page - 1) * limit;

  const values: (string | number)[] = [];
  let where = '';
  if (status) {
    values.push(status);
    where = `WHERE status = $1`;
  }

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM emails ${where}`,
    values
  );
  const total = parseInt(countRes.rows[0].count);

  values.push(limit, offset);
  const dataRes = await pool.query(
    `SELECT * FROM emails ${where}
     ORDER BY scheduled_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return res.json({ data: dataRes.rows, total, page, limit });
});

export default router;
