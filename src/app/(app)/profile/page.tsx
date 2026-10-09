// src/app/profile/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { imara, ImaraApiError } from '@/lib/api';
import {
  getKycStatus,
  kycStatusLabel,
  type KycStatusResponse,
} from '@/lib/kyc-api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface BorrowerProfile {
  borrower_id: number;
  merchant_id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string;
  email_verified: boolean;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Local UI helpers                                                   */
/* ------------------------------------------------------------------ */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-ink-100 bg-white px-5 py-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        {title}
      </h2>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 border-b border-ink-100 bg-white px-5 py-3.5 text-left transition active:bg-ink-100/40 last:border-b-0"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-50 text-plum-700">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold tracking-tight text-ink-950">
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-[11px] font-medium text-ink-400">{hint}</p>
        )}
      </div>

      <ChevronRight size={16} className="shrink-0 text-ink-400" strokeWidth={2.2} />
    </button>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-bold tracking-tight text-ink-950 tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10.5px] font-medium text-ink-400">{sub}</p>
      )}
    </div>
  );
}

function ProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-plum-800/15"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-plum-800"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[12px] font-bold leading-none tracking-tight text-plum-800 tabular-nums">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KYC card                                                           */
/* ------------------------------------------------------------------ */
function KycCard({
  kyc,
  onAction,
}: {
  kyc: KycStatusResponse;
  onAction: () => void;
}) {
  const { kycStatus, progress, submittedAt, verifiedAt, rejectionReason } = kyc;

  // ─── VERIFIED — yellow brand card ────────────────────────
  if (kycStatus === 'VERIFIED') {
    return (
      <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 py-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-plum-800/10 text-plum-800">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
              KYC status
            </p>
            <p className="mt-1 text-[15px] font-bold tracking-tight text-plum-800">
              Profile verified
            </p>
            {verifiedAt && (
              <p className="mt-0.5 text-[11px] text-plum-800/70">
                Verified on {new Date(verifiedAt).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── SUBMITTED — blue card ───────────────────────────────
  if (kycStatus === 'SUBMITTED') {
    return (
      <div className="overflow-hidden rounded-3xl border border-blue-200 bg-blue-50 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
            <Shield size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700/70">
              KYC status
            </p>
            <p className="mt-1 text-[15px] font-bold tracking-tight text-blue-900">
              Under review
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-blue-700/90">
              {submittedAt
                ? `Submitted on ${new Date(submittedAt).toLocaleDateString(
                    'en-KE',
                    { day: 'numeric', month: 'short', year: 'numeric' }
                  )}. We'll notify you soon.`
                : "We'll notify you soon."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── REJECTED — red card ─────────────────────────────────
  if (kycStatus === 'REJECTED') {
    return (
      <div className="overflow-hidden rounded-3xl border border-red-200 bg-red-50 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
            <ShieldAlert size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700/70">
              KYC status
            </p>
            <p className="mt-1 text-[15px] font-bold tracking-tight text-red-900">
              Needs correction
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-red-800/90">
              {rejectionReason || 'Please review your details and resubmit.'}
            </p>
          </div>
        </div>

        <button
          onClick={onAction}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13px] font-bold tracking-tight text-white transition active:scale-[0.985]"
        >
          Review and resubmit
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  // ─── PENDING — amber card with progress ring ─────────────
  return (
    <div className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <ShieldAlert size={20} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700/70">
            KYC status
          </p>
          <p className="mt-1 text-[15px] font-bold tracking-tight text-amber-900">
            Profile incomplete
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-amber-700/90">
            Complete your profile to unlock borrowing.
          </p>
        </div>

        <ProgressRing percent={progress.percentage} size={52} />
      </div>

      <div className="mt-3 text-[11px] font-medium text-amber-900/80">
        {progress.filled} of {progress.total} fields done
      </div>

      <button
        onClick={onAction}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13px] font-bold tracking-tight text-white transition active:scale-[0.985]"
      >
        Complete your profile
        <ChevronRight size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading state                                                      */
/* ------------------------------------------------------------------ */
function LoadingState() {
  return (
    <div className="min-h-screen bg-page grid place-items-center">
      <Loader2 className="animate-spin text-plum-800" size={28} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const router = useRouter();

  const [borrower, setBorrower] = useState<BorrowerProfile | null>(null);
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meRes, kycRes] = await Promise.allSettled([
          imara.me(),
          getKycStatus(),
        ]);

        if (cancelled) return;

        if (meRes.status === 'fulfilled') {
          setBorrower(meRes.value.data);
        } else {
          const err = meRes.reason;
          if (!(err instanceof ImaraApiError)) {
            console.error('Failed to load profile:', err);
          }
          setError('Could not load your profile. Please try again.');
        }

        if (kycRes.status === 'fulfilled') {
          setKyc(kycRes.value);
        } else {
          const err = kycRes.reason;
          if (!(err instanceof ImaraApiError)) {
            console.error('Failed to load KYC status:', err);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const derived = useMemo(() => {
    if (!borrower) return null;

    const fullName = [borrower.first_name, borrower.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const displayName = fullName || borrower.email.split('@')[0];

    const initials = displayName
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const memberSince = borrower.created_at
      ? new Date(borrower.created_at).toLocaleDateString('en-KE', {
          month: 'short',
          year: 'numeric',
        })
      : '—';

    return {
      displayName,
      initials,
      memberSince,
    };
  }, [borrower]);

  if (loading) return <LoadingState />;

  if (!borrower || !derived) {
    return (
      <div className="min-h-screen bg-page p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-800">
          {error || 'Could not load your profile.'}
        </div>
      </div>
    );
  }

  const kycVerified = kyc?.kycStatus === 'VERIFIED';
  const maxLimit = kyc?.creditLimit?.maxLimit ?? 0;
  const availableLimit = kyc?.creditLimit?.availableLimit ?? 0;

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* ============ NAV ============ */}
      <div className="sticky top-0 z-30 bg-plum-800">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="relative shrink-0">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/20">
              {derived.initials}
            </div>
            {kycVerified && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-plum-800 bg-brand-500 text-plum-800">
                <svg viewBox="0 0 10 10" className="h-2 w-2">
                  <path
                    d="M1.5 5l2 2 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold tracking-tight text-white">
              {derived.displayName}
            </h1>
            <p className="mt-0.5 truncate text-[11px] font-medium text-white/60">
              {borrower.phone || borrower.email}
            </p>
          </div>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ KYC CARD ============ */}
      <div className="px-3 pt-3">
        {kyc ? (
          <KycCard kyc={kyc} onAction={() => router.push('/kyc')} />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white px-5 py-5 text-[13px] text-ink-500">
            KYC status unavailable. Pull to refresh.
          </div>
        )}
      </div>

      {/* ============ ACCOUNT SUMMARY ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Account" />

        <div className="grid grid-cols-3 divide-x divide-ink-100">
          <StatTile
            label="Limit"
            value={
              maxLimit > 0
                ? `KES ${(maxLimit / 1000).toFixed(maxLimit >= 1000 ? 0 : 1)}K`
                : 'KES 0'
            }
          />
          <StatTile
            label="Available"
            value={
              availableLimit > 0
                ? `KES ${(availableLimit / 1000).toFixed(availableLimit >= 1000 ? 0 : 1)}K`
                : 'KES 0'
            }
          />
          <StatTile
            label="Member"
            value={derived.memberSince.split(' ')[1] || '—'}
            sub={derived.memberSince.split(' ')[0]}
          />
        </div>
      </section>

      {/* ============ SETTINGS ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Settings" />

        <SettingsRow
          icon={<Bell size={17} strokeWidth={2.2} />}
          label="Notifications"
          hint="Push and SMS preferences"
        />
        <SettingsRow
          icon={<Lock size={17} strokeWidth={2.2} />}
          label="Security & PIN"
          hint="Manage your login PIN"
        />
        <SettingsRow
          icon={<WalletCards size={17} strokeWidth={2.2} />}
          label="Disbursement account"
          hint={borrower.phone || 'Not set'}
        />
      </section>

      {/* ============ SUPPORT ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Support" />

        <SettingsRow
          icon={<HelpCircle size={17} strokeWidth={2.2} />}
          label="Help centre"
        />
        <SettingsRow
          icon={<FileText size={17} strokeWidth={2.2} />}
          label="Terms & conditions"
        />
        <SettingsRow
          icon={<Shield size={17} strokeWidth={2.2} />}
          label="Privacy policy"
        />
        <SettingsRow
          icon={<Info size={17} strokeWidth={2.2} />}
          label="About IMARA CREDIT"
          hint="Version 0.1.0"
        />
      </section>

      {/* ============ FOOTER ============ */}
      <div className="px-8 pb-8 pt-6 text-center">
        <p className="text-[10px] font-medium tracking-wide text-ink-400/80">
          IMARA CREDIT · v0.1.0
        </p>
      </div>
    </div>
  );
}