'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

function SessionExpiredContent() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get('reason') || 'expired';

  const messages: Record<string, string> = {
    REFRESH_FAILED:
      'For your security, please sign in again to continue.',
    TOKEN_REUSE_DETECTED:
      'A security issue was detected with your session. Please sign in again.',
    TOKEN_EXPIRED:
      'Your session expired. Please sign in again.',
    SESSION_ABSOLUTE_EXPIRED:
      'You have been signed in for the maximum allowed time. Please sign in again.',
    SESSION_IDLE_EXPIRED:
      'You were inactive for too long. Please sign in again.',
    SESSION_NOT_FOUND:
      'Your session is no longer valid. Please sign in again.',
    TOKEN_BLACKLISTED:
      'Your session was ended. Please sign in again.',
    expired:
      'Your session has ended. Please sign in again.',
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden rounded-b-[32px] bg-plum-800 px-6 pt-8 pb-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-plum-700/60 blur-3xl" />
        <h1 className="relative text-[26px] font-bold leading-tight tracking-tight text-white">
          Session ended
        </h1>
        <p className="relative mt-2 max-w-[18rem] text-[12.5px] font-medium leading-snug text-white/70">
          {messages[reason] || messages.expired}
        </p>
      </div>

      <div className="px-6 pt-8 pb-10">
        <Button
          type="button"
          onClick={() => router.replace('/login')}
          className="w-full"
          size="lg"
        >
          Sign in again
        </Button>
      </div>
    </div>
  );
}

export default function SessionExpiredPage() {
  return (
    <Suspense fallback={null}>
      <SessionExpiredContent />
    </Suspense>
  );
}