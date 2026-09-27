import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { redis } from './redis';
import { pool } from './db';
import { getTransporter } from './mailer';
import { checkAndIncrement, msUntilNextHour } from './rateLimit';
import { notifySlack } from './slack';
import { emailQueue } from './queue';
import { JobData } from './types';
import dotenv from 'dotenv';
dotenv.config();

const MAX_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '200');
const CONCURRENCY  = parseInt(process.env.WORKER_CONCURRENCY || '5');

async function processJob(job: Job<JobData>): Promise<void> {
  const { emailId, sender, recipient, subject, body } = job.data;

  // --- Idempotency check ---
  const { rows } = await pool.query(
    'SELECT status FROM emails WHERE id = $1',
    [emailId]
  );
  if (!rows.length || rows[0].status !== 'scheduled') {
    console.log(`[worker] Skipping ${emailId} — status: ${rows[0]?.status}`);
    return;
  }

  // --- Rate limit check ---
  const allowed = await checkAndIncrement(sender, MAX_PER_HOUR);
  if (!allowed) {
    const delay = msUntilNextHour();
    console.log(`[worker] Rate limit hit for ${sender}. Re-queuing in ${Math.round(delay/1000)}s`);
    await notifySlack(sender, `Hourly limit of ${MAX_PER_HOUR} reached. Email to ${recipient} rescheduled.`);
    await emailQueue.add('sendEmail', job.data, {
      delay,
      jobId: `retry-${emailId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return;
  }

  // --- Send email ---
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({ from: sender, to: recipient, subject, text: body });
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    await pool.query(
      `UPDATE emails SET status='sent', sent_at=NOW(), preview_url=$1 WHERE id=$2`,
      [previewUrl, emailId]
    );

    // 🔴 Emit real-time event to all connected dashboard clients
    try {
      const { io } = await import('./index');
      io.emit('email:update', { emailId, recipient, status: 'sent', previewUrl });
    } catch (_) {}

    console.log(`[worker] ✅ Sent to ${recipient} — preview: ${previewUrl}`);
  } catch (err) {
    await pool.query(`UPDATE emails SET status='failed' WHERE id=$1`, [emailId]);

    try {
      const { io } = await import('./index');
      io.emit('email:update', { emailId, recipient, status: 'failed', previewUrl: null });
    } catch (_) {}

    console.error(`[worker] ❌ Failed to send to ${recipient}:`, err);
    throw err;
  }
}

export function startWorker() {
  const worker = new Worker<JobData>('emailQueue', processJob, {
    connection: redis,
    concurrency: CONCURRENCY,
    limiter: { max: 1, duration: 2000 },
  });

  worker.on('completed', (job) => console.log(`[worker] Job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`[worker] Job ${job?.id} failed:`, err.message));

  console.log(`✅ Worker started — concurrency: ${CONCURRENCY}, limiter: 1 per 2s`);
  return worker;
}