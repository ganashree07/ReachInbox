'use client';
import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { scheduleEmails } from '@/lib/api';

interface Props { onClose: () => void; onScheduled: () => void; }

export function ComposeModal({ onClose, onScheduled }: Props) {
  const { data: session } = useSession();
  const [subject, setSubject]     = useState('');
  const [body, setBody]           = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [scheduledAt, setScheduledAt] = useState('');
  const [delayBetweenMs, setDelayBetweenMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [loading, setLoading]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCSV(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const emails: string[] = [];
        for (const row of results.data) {
          const val = Object.values(row)[0]?.trim();
          if (val && /\S+@\S+\.\S+/.test(val)) emails.push(val);
        }
        setRecipients(emails);
        setRecipientCount(emails.length);
        toast.success(`${emails.length} email addresses loaded`);
      },
      error() { toast.error('Failed to parse CSV'); }
    });
  }

  async function handleSubmit() {
    if (!subject || !body || !scheduledAt || !recipients.length) {
      toast.error('Fill in all fields and upload a CSV');
      return;
    }
    const sender = session?.user?.email || 'scheduler@reachinbox.ai';
    setLoading(true);
    try {
      const res = await scheduleEmails({ sender, recipients, subject, body, scheduledAt, delayBetweenMs, hourlyLimit });
      toast.success(`${res.scheduled} emails scheduled!`);
      onScheduled();
      onClose();
    } catch {
      toast.error('Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-white">New email campaign</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Subject</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Your email subject"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Body</label>
            <textarea
              value={body} onChange={e => setBody(e.target.value)}
              rows={4} placeholder="Write your message here…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
          </div>

          {/* CSV Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Recipients (CSV)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-slate-700 rounded-lg px-4 py-4 cursor-pointer hover:border-brand-500 hover:bg-brand-500/5 transition-colors text-center"
            >
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                onChange={e => e.target.files?.[0] && handleCSV(e.target.files[0])} />
              {recipientCount > 0 ? (
                <p className="text-emerald-400 text-sm font-medium">{recipientCount} addresses loaded ✓</p>
              ) : (
                <>
                  <p className="text-slate-400 text-sm">Click to upload CSV</p>
                  <p className="text-slate-600 text-xs mt-1">First column should be email addresses</p>
                </>
              )}
            </div>
          </div>

          {/* Schedule time */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Send starting at</label>
            <input
              type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Advanced settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Delay between sends (ms)</label>
              <input
                type="number" min={0} value={delayBetweenMs} onChange={e => setDelayBetweenMs(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Hourly limit per sender</label>
              <input
                type="number" min={1} value={hourlyLimit} onChange={e => setHourlyLimit(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>}
            {loading ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
