'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Header } from '@/components/Header';
import { EmailTable } from '@/components/EmailTable';
import { ComposeModal } from '@/components/ComposeModal';
import { fetchEmails } from '@/lib/api';
import { Email } from '@/lib/types';

type Tab = 'scheduled' | 'sent';

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();

  const [tab, setTab]         = useState<Tab>('scheduled');
  const [emails, setEmails]   = useState<Email[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchEmails(tab);
      setEmails(res.data);
      setTotal(res.total);
    } catch { /* retry on next event */ }
    finally { setLoading(false); }
  }, [tab]);

  // redirect if not authed
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // initial load when tab changes
  useEffect(() => {
    load();
  }, [load]);

  // WebSocket — live updates
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

    socket.on('connect', () => console.log('🔌 Socket connected'));

    socket.on('email:update', (data: { emailId: string; recipient: string; status: string; previewUrl: string | null }) => {
      if (data.status === 'sent') {
        toast.success(`Sent to ${data.recipient}`);
      } else if (data.status === 'failed') {
        toast.error(`Failed: ${data.recipient}`);
      }
      // silently reload current tab
      load(true);
    });

    socket.on('disconnect', () => console.log('🔌 Socket disconnected'));

    return () => { socket.disconnect(); };
  }, [load]);

  if (status === 'loading' || status === 'unauthenticated') return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header />

      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        {/* Page title + compose button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">Email campaigns</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {total} {tab} email{total !== 1 ? 's' : ''}
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-400 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                live
              </span>
            </p>
          </div>
          <button
            onClick={() => setCompose(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Compose
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
          {(['scheduled', 'sent'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <EmailTable emails={emails} loading={loading} type={tab} />
        </div>

        <p className="text-xs text-slate-600 mt-4 text-center">
          Real-time queue →{' '}
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/admin/queues`}
            target="_blank" rel="noopener noreferrer"
            className="text-brand-500 hover:text-brand-400 underline underline-offset-2">
            Bull Board
          </a>
        </p>
      </main>

      {compose && (
        <ComposeModal
          onClose={() => setCompose(false)}
          onScheduled={() => { setTab('scheduled'); load(); }}
        />
      )}
    </div>
  );
}