'use client';
import { Email } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  emails: Email[];
  loading: boolean;
  type: 'scheduled' | 'sent';
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function EmailTable({ emails, loading, type }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
        <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Loading…
      </div>
    );
  }

  if (!emails.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <p className="text-slate-400 font-medium">No {type} emails yet</p>
        <p className="text-slate-600 text-sm mt-1">
          {type === 'scheduled' ? 'Compose a new email to get started.' : 'Sent emails will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
              {type === 'scheduled' ? 'Scheduled for' : 'Sent at'}
            </th>
            <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            {type === 'sent' && (
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Preview</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {emails.map((email) => (
            <tr key={email.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="py-3 px-4 text-slate-300 font-mono text-xs">{email.recipient}</td>
              <td className="py-3 px-4 text-slate-200 max-w-xs truncate">{email.subject}</td>
              <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                {type === 'scheduled' ? fmt(email.scheduled_at) : fmt(email.sent_at)}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={email.status} />
              </td>
              {type === 'sent' && (
                <td className="py-3 px-4">
                  {email.preview_url ? (
                    <a href={email.preview_url} target="_blank" rel="noopener noreferrer"
                      className="text-brand-500 hover:text-brand-400 text-xs underline underline-offset-2">
                      View →
                    </a>
                  ) : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
