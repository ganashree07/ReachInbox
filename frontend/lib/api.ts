import axios from 'axios';
import { EmailsResponse, SchedulePayload } from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

export async function fetchEmails(
  status: 'scheduled' | 'sent',
  page = 1,
  limit = 50
): Promise<EmailsResponse> {
  const { data } = await api.get<EmailsResponse>('/api/emails', {
    params: { status, page, limit },
  });
  return data;
}

export async function scheduleEmails(payload: SchedulePayload) {
  const { data } = await api.post('/api/emails/schedule', payload);
  return data;
}
