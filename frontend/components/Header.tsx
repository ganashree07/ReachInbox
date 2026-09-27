'use client';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">ReachInbox</span>
      </div>

      {session?.user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white leading-none">{session.user.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{session.user.email}</p>
          </div>
          {session.user.image && (
            <Image
              src={session.user.image}
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full ring-2 ring-slate-700"
            />
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}