// src/components/KycModal.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Clock, ChevronRight, X } from 'lucide-react';
import {
  type KycStatusResponse,
  type KycStatus,
} from '@/lib/kyc-api';

interface Props {
  open: boolean;
  data: KycStatusResponse | null;
  onClose: () => void;
  /**
   * When true, the modal cannot be dismissed by the user. Used when
   * the borrower tries to start a loan application without verified
   * KYC. They must go to the KYC page.
   */
  forceOpen?: boolean;
}

// ─── Progress ring ───────────────────────────────────────────────

function ProgressRing({ percent, size = 96 }: { percent: number; size?: number }) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-plum-800/10"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-plum-800 transition-[stroke-dasharray] duration-500"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[20px] font-bold tracking-tight text-plum-800 tabular-nums">
          {percent}%
        </span>
      </div>
    </div>
  );
}

// ─── Status config ───────────────────────────────────────────────

function statusConfig(status: KycStatus) {
  switch (status) {
    case 'PENDING':
      return {
        tone: 'action' as const,
        icon: <ShieldAlert size={18} strokeWidth={2.2} />,
        eyebrow: 'KYC required',
        headline: 'Complete your KYC to unlock borrowing',
        body: 'Fill in a short form so your lender can verify your details. It takes about two minutes.',
        ctaLabel: 'Complete KYC now',
      };
    case 'REJECTED':
      return {
        tone: 'action' as const,
        icon: <ShieldAlert size={18} strokeWidth={2.2} />,
        eyebrow: 'Action needed',
        headline: 'Your KYC was rejected',
        body: 'Please review your details and submit again.',
        ctaLabel: 'Review and resubmit',
      };
    case 'SUBMITTED':
      return {
        tone: 'info' as const,
        icon: <Clock size={18} strokeWidth={2.2} />,
        eyebrow: 'Under review',
        headline: 'Your KYC is being reviewed',
        body: "We'll let you know as soon as it's approved. You can close this screen.",
        ctaLabel: null,
      };
    case 'VERIFIED':
      return {
        tone: 'ok' as const,
        icon: <ShieldCheck size={18} strokeWidth={2.2} />,
        eyebrow: 'Verified',
        headline: 'Your KYC is complete',
        body: 'You can now apply for a loan.',
        ctaLabel: null,
      };
  }
}

// ─── Component ───────────────────────────────────────────────────

export default function KycModal({ open, data, onClose, forceOpen = false }: Props) {
  const router = useRouter();

  const status = data?.kycStatus ?? 'PENDING';
  const cfg = useMemo(() => statusConfig(status), [status]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !data) return null;

  const { progress, creditLimit } = data;
  const percent = progress.percentage;
  const filled = progress.filled;
  const total = progress.total;

  const handleCta = () => {
    router.push('/kyc');
  };

  const handleClose = () => {
    if (forceOpen) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={
          'relative w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden ' +
          'animate-[slideUp_.22s_ease-out]'
        }
        role="dialog"
        aria-modal="true"
      >
        {/* Yellow accent line at the top, matching the app chrome */}
        <div className="h-1 w-full bg-brand-500" />

        {/* Close button — hidden when forceOpen */}
        {!forceOpen && (
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:bg-ink-100/60 transition-colors"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        )}

        <div className="px-6 pb-6 pt-5">
          {/* Eyebrow + icon */}
          <div className="flex items-center gap-2">
            <div
              className={
                'grid h-8 w-8 shrink-0 place-items-center rounded-full ' +
                (cfg.tone === 'action'
                  ? 'bg-amber-100 text-amber-700'
                  : cfg.tone === 'info'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700')
              }
            >
              {cfg.icon}
            </div>
            <p
              className={
                'text-[10px] font-semibold uppercase tracking-[0.16em] ' +
                (cfg.tone === 'action'
                  ? 'text-amber-700/80'
                  : cfg.tone === 'info'
                  ? 'text-blue-700/80'
                  : 'text-emerald-700/80')
              }
            >
              {cfg.eyebrow}
            </p>
          </div>

          {/* Headline */}
          <h2 className="mt-3 text-[18px] font-bold leading-snug tracking-tight text-ink-950">
            {cfg.headline}
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
            {cfg.body}
          </p>

          {/* Progress block — hidden for VERIFIED */}
          {status !== 'VERIFIED' && (
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-page px-4 py-4">
              <ProgressRing percent={percent} size={84} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-ink-950">
                  Profile completion
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {filled} of {total} fields done
                </p>

                {creditLimit && creditLimit.maxLimit > 0 && (
                  <p className="mt-2 text-[11px] text-ink-500">
                    Your credit limit:{' '}
                    <strong className="text-ink-950">
                      {new Intl.NumberFormat('en-KE', {
                        style: 'currency',
                        currency: creditLimit.currency || 'KES',
                        minimumFractionDigits: 0,
                      }).format(creditLimit.maxLimit)}
                    </strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rejection reason — only for REJECTED */}
          {status === 'REJECTED' && data.rejectionReason && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700/80">
                Reviewer note
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-red-900">
                {data.rejectionReason}
              </p>
            </div>
          )}

          {/* CTA */}
          {cfg.ctaLabel && (
            <button
              type="button"
              onClick={handleCta}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-plum-800 px-5 py-3.5 text-[14px] font-bold tracking-tight text-white transition active:scale-[0.985]"
            >
              {cfg.ctaLabel}
              <ChevronRight size={16} strokeWidth={2.6} />
            </button>
          )}

          {/* Secondary link — only when not forceOpen and not verified */}
          {!forceOpen && status !== 'VERIFIED' && (
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full text-center text-[12px] font-medium text-ink-400 hover:text-ink-600 transition-colors"
            >
              Remind me later
            </button>
          )}
        </div>
      </div>

      {/* Keyframes — Tailwind arbitrary animation requires this to
          live somewhere. We define it once per mount; if your project
          has a global CSS file, move it there for cleanliness. */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}