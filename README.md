# ReachInbox Email Scheduler

A production-grade email scheduling system built for the ReachInbox hiring assignment. Upload a CSV of recipients, set a send time, and the system queues and delivers every email reliably — with live dashboard updates, surviving server restarts without losing a single job.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Express.js + TypeScript |
| Queue | BullMQ + Redis |
| Database | PostgreSQL |
| SMTP | Ethereal Email (fake SMTP) |
| Real-time | Socket.io (WebSockets) |
| Frontend | Next.js + Tailwind CSS + TypeScript |
| Auth | NextAuth.js (Google OAuth) |
| Queue UI | Bull Board (`/admin/queues`) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Docker (for Redis + PostgreSQL)

### 1. Start infrastructure
```bash
cd backend
docker-compose up -d
```

### 2. Backend
```bash
cd backend
cp .env.example .env      # fill in values
npm install
npm run dev
# → http://localhost:4000
# → http://localhost:4000/admin/queues  (Bull Board)
```

### 3. Frontend
```bash
cd frontend
cp .env.local.example .env.local   # fill in Google OAuth creds
npm install
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379
WORKER_CONCURRENCY=5
MAX_EMAILS_PER_HOUR_PER_SENDER=200
SLACK_WEBHOOK_URL=          # optional
ETHEREAL_USER=              # auto-generated on first run
ETHEREAL_PASS=              # auto-generated on first run
```

### Frontend (`frontend/.env.local`)
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any-random-string
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Ethereal Email Setup
On first run the backend auto-creates an Ethereal test account and logs the credentials:
```
📧 Ethereal account created
   User: xxxx@ethereal.email
   Pass: xxxx
```
Copy these into `.env` so they persist across restarts. Every sent email gets a preview URL visible in the Sent tab.

### Google OAuth Setup
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Paste Client ID + Secret into `frontend/.env.local`

---

## Architecture

### How scheduling works
1. User uploads a CSV of recipients and sets a send time in the dashboard
2. `POST /api/emails/schedule` is called with the recipient list
3. For each recipient, a row is inserted into PostgreSQL (`status = scheduled`)
4. A BullMQ delayed job is enqueued with `jobId = emailId` and `delay = scheduledAt - now`
5. BullMQ holds the job in Redis until the delay expires
6. The worker picks it up, checks the rate limit, sends via Ethereal SMTP, and updates the DB row to `status = sent`
7. The backend emits a `email:update` WebSocket event to all connected clients
8. The dashboard updates instantly — no polling, no refresh needed

### How persistence on restart works
- BullMQ stores all jobs in Redis, which runs with `appendonly yes` (AOF persistence)
- Every job is also written to PostgreSQL before being enqueued
- On startup, the backend reconciles: any DB row with `status = scheduled` and a future `scheduled_at` that has no corresponding BullMQ job gets re-enqueued
- Result: kill the server, restart it — future emails still send at the correct time, nothing is duplicated

### How real-time updates work (WebSockets)
- Backend creates a Socket.io server alongside Express on the same port
- When the worker finishes sending an email, it emits `email:update` with the emailId, recipient, status and preview URL
- The frontend listens for this event, reloads the table instantly, and shows a toast notification
- No polling — updates happen in under 100ms of the email being sent

### How idempotency works
- Each email row gets a UUID (`emailId`)
- The BullMQ job is created with `jobId = emailId`
- BullMQ deduplicates by jobId — adding the same jobId twice is a no-op
- The worker also checks DB status before sending: if already `sent`, it acks and returns

---

## Rate Limiting

**Redis key:** `rate:sender:<email>:<YYYY-MM-DD-HH>`

**Logic:**
- On each send attempt the worker does `INCR` on the key (TTL: 2 hours)
- If the counter exceeds `MAX_EMAILS_PER_HOUR_PER_SENDER`, the INCR is rolled back
- The job is re-queued with a delay of `ms until next UTC hour` — jobs are never dropped
- If `SLACK_WEBHOOK_URL` is set, a Slack notification fires on rate limit hit

**Configurable via:** `MAX_EMAILS_PER_HOUR_PER_SENDER` in `.env`

---

## Concurrency

- Worker concurrency: `WORKER_CONCURRENCY` env var (default: 5)
- Minimum delay between sends: BullMQ limiter `{ max: 1, duration: 2000 }` — 1 job per 2 seconds
- Both values are configurable via environment variables

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/emails/schedule` | Schedule emails for a list of recipients |
| `GET` | `/api/emails?status=scheduled\|sent` | List emails with pagination |
| `GET` | `/admin/queues` | Bull Board live queue dashboard |

### POST /api/emails/schedule
```json
{
  "sender": "you@gmail.com",
  "recipients": ["a@example.com", "b@example.com"],
  "subject": "Hello",
  "body": "This is your email body",
  "scheduledAt": "2024-12-01T10:00:00.000Z",
  "delayBetweenMs": 2000,
  "hourlyLimit": 200
}
```

---

## Features Implemented

### Backend
- [x] Email scheduling API (`POST /api/emails/schedule`)
- [x] BullMQ delayed jobs — no cron, ever
- [x] PostgreSQL persistence — survives server restarts
- [x] Idempotency via UUID jobId deduplication
- [x] Ethereal Email SMTP with preview URLs
- [x] Redis-backed rate limiting per sender per hour
- [x] Over-limit jobs rescheduled to next hour (never dropped)
- [x] Slack webhook notification on rate limit hit
- [x] Configurable worker concurrency
- [x] Minimum delay between sends (BullMQ limiter)
- [x] Bull Board live queue dashboard at `/admin/queues`
- [x] WebSocket server (Socket.io) for real-time push updates

### Frontend
- [x] Google OAuth login via NextAuth
- [x] User name, email, avatar in header
- [x] Logout
- [x] Dashboard with Scheduled / Sent tabs
- [x] Live WebSocket updates — table refreshes instantly on email send
- [x] Toast notifications per email sent/failed
- [x] Live indicator (green pulsing dot) showing active WebSocket connection
- [x] Compose modal with subject, body, datetime picker
- [x] CSV upload with recipient count detection (papaparse)
- [x] Configurable delay between sends and hourly limit
- [x] Loading states and empty states
- [x] Ethereal preview link in Sent table
- [x] Status badges (scheduled / sent / failed)

---

## Trade-offs & Assumptions

- **Elasticsearch skipped** — PostgreSQL with indexed queries used instead. Elasticsearch would add full-text search but significantly increases setup complexity.
- **Slack uses webhook URL** instead of full OAuth flow — stored in `.env`. Full OAuth would be a production day-2 feature.
- **Single worker instance** — rate limiting uses Redis INCR which is safe for one worker. Multi-worker setups should use a Lua script for atomic check-and-increment.
- **Ethereal SMTP** — emails are captured and never delivered to real inboxes. Each sent email gets a preview URL to verify delivery.
