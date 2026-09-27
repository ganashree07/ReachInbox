import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { initDB } from './db';
import { emailQueue } from './queue';
import { startWorker } from './worker';
import emailsRouter from './routes/emails';

dotenv.config();

const app        = express();
const httpServer = createServer(app);
const PORT       = process.env.PORT || 4000;

// ── Socket.io ───────────────────────────────────────────────────────────────
export const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('📡 Client connected:', socket.id);
  socket.on('disconnect', () => console.log('📡 Client disconnected:', socket.id));
});

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Bull Board ──────────────────────────────────────────────────────────────
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });
app.use('/admin/queues', serverAdapter.getRouter());

// ── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/emails', emailsRouter);

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  await initDB();
  startWorker();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Bull Board at http://localhost:${PORT}/admin/queues`);
  });
}

boot().catch(console.error);