export type EmailStatus = 'scheduled' | 'sent' | 'failed';

export interface EmailRow {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduled_at: Date;
  sent_at: Date | null;
  preview_url: string | null;
  created_at: Date;
}

export interface ScheduleRequestBody {
  sender: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;           // ISO string
  delayBetweenMs?: number;       // ms between each email, default 2000
  hourlyLimit?: number;          // override per-request, default from env
}

export interface JobData {
  emailId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
}
