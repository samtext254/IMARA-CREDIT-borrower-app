'use client';

import Link from 'next/link';
import { CheckCircle2, Clock3 } from 'lucide-react';

export default function ApplyDonePage() {
  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="relative overflow-hidden rounded-b-[32px] bg-plum-800 px-6 pt-12 pb-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-plum-700/60 blur-3xl" />

        <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
          <CheckCircle2 size={30} strokeWidth={2.2} />
        </div>

        <h1 className="relative mt-6 text-[26px] font-bold leading-tight tracking-tight text-white">
          Application received
        </h1>
        <p className="relative mt-2 max-w-[20rem] text-[13px] font-medium leading-snug text-white/70">
          Your loan application is now under review. We will notify you as
          soon as your lender approves it.
        </p>
      </div>

      <div className="px-4 pt-6">
        <div className="rounded-2xl border border-ink-100 bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-50 text-plum-700">
              <Clock3 size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Status
              </p>
              <p className="mt-0.5 text-[13px] font-semibold text-ink-950">
                Pending approval
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-snug text-ink-500">
            You can track your loan from the Loans tab. You will also receive
            an email and SMS when the decision is made.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <Link
            href="/home"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3.5 text-[14px] font-bold tracking-tight text-plum-800 transition active:scale-[0.985]"
          >
            Back to home
          </Link>
          <Link
            href="/loans"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-[14px] font-bold tracking-tight text-ink-800 ring-1 ring-ink-100 transition active:scale-[0.985]"
          >
            View my loans
          </Link>
        </div>
      </div>
    </div>
  );
}