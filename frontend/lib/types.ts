export type EmailStatus = 'scheduled' | 'sent' | 'failed';

export interface Email {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduled_at: string;
  sent_at: string | null;
  preview_url: string | null;
  created_at: string;
}

export interface EmailsResponse {
  data: Email[];
  total: number;
  page: number;
  limit: number;
}

export interface SchedulePayload {
  sender: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}
