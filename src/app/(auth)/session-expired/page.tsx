
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-8 lg:flex-row lg:items-center lg:justify-center lg:gap-12 lg:px-8">
        {/* Desktop brand panel */}
        <section className="relative hidden min-h-[440px] w-full max-w-md flex-col justify-between overflow-hidden rounded-3xl bg-[#0B1F3A] p-9 text-white shadow-xl lg:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D6A83E]/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl"
          />

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D6A83E]/40 bg-white/5">
              <span className="text-xl font-extrabold text-[#D6A83E]">
                I
              </span>
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#D6A83E]">
              Imara Credit
            </p>

            <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight">
              Your financial journey, securely managed.
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Your security matters. Sign in again to continue accessing your
              account and financial services.
            </p>
          </div>

          <div className="relative border-t border-white/15 pt-5 text-xs text-white/50">
            Trusted financial solutions
          </div>
        </section>

        {/* Session-expired card */}
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center lg:flex-none">
          {/* Mobile brand header */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F3A] shadow-sm">
              <span className="text-lg font-extrabold text-[#D6A83E]">
                I
              </span>
            </div>

            <div>
              <p className="text-sm font-bold tracking-wide text-[#0B1F3A]">
                IMARA CREDIT
              </p>
              <p className="text-xs text-slate-500">
                Trusted financial solutions
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:shadow-md">
            <div className="relative overflow-hidden bg-[#0B1F3A] px-6 py-8 sm:px-8 sm:py-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#D6A83E]/15 blur-3xl"
              />

              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6A83E]/40 bg-white/5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-7 w-7 text-[#D6A83E]"
                >
                  <path
                    d="M12 3.5 19 6v5.6c0 4.2-2.9 7.4-7 8.9-4.1-1.5-7-4.7-7-8.9V6l7-2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12.2 11 14l4-4.2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <p className="relative mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#D6A83E]">
                Account security
              </p>

              <h1 className="relative mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
                Session ended
              </h1>

              <p className="relative mt-3 text-sm leading-6 text-white/75 sm:text-base">
                {messages[reason] || messages.expired}
              </p>
            </div>

            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="M12 7.5v5M12 16h.01"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>

                <p className="text-sm leading-5 text-amber-900">
                  For your protection, you’ll need to sign in again before
                  continuing.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => router.replace('/login')}
                className="mt-6 h-12 w-full rounded-xl bg-[#0B1F3A] font-semibold text-white shadow-sm transition hover:bg-[#102B4E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A83E] focus-visible:ring-offset-2"
                size="lg"
              >
                Sign in again
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="ml-2 h-4 w-4"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>

              <p className="mt-5 text-center text-xs leading-5 text-slate-500">
                Your account remains protected. You can safely sign in again.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Imara Credit
          </p>
        </section>
      </div>
    </main>
  );
}

export default function SessionExpiredPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div
            role="status"
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#D6A83E]"
          />
          <span className="sr-only">Loading session status…</span>
        </main>
      }
    >
      <SessionExpiredContent />
    </Suspense>
  );
}