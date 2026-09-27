import { EmailStatus } from '@/lib/types';

const styles: Record<EmailStatus, string> = {
  scheduled: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30',
  sent:       'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30',
  failed:     'bg-red-500/10 text-red-400 ring-1 ring-red-500/30',
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
