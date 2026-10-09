'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  HelpCircle,
  History,
  LogOut,
  Plus,
  Receipt,
  Settings,
  User,
  WalletCards,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { imara, ImaraApiError } from '@/lib/api';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { Eligibility, Loan, LoanScheduleEntry } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';
import KycModal from '@/components/KycModal';

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

const BLOCKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'DISBURSED',
  'ACTIVE',
  'OVERDUE',
] as const;

const KYC_DISMISS_PREFIX = 'kyc-dismissed';

function kycDismissKey(data: KycStatusResponse | null): string {
  if (!data) return KYC_DISMISS_PREFIX + '-unknown';
  const stamp = data.submittedAt || 'na';
  return `${KYC_DISMISS_PREFIX}-${data.kycStatus}-${stamp}`;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatKes(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
  return Math.round(n).toLocaleString('en-KE');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function computeProgress(loan: Loan): number {
  const principal = parseFloat(loan.principal_amount || '0');
  const outstandingPrincipal = parseFloat(loan.outstanding_principal || '0');
  if (!principal || principal <= 0) return 0;
  const repaid = Math.max(0, principal - outstandingPrincipal);
  const pct = (repaid / principal) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function nextInstallment(
  schedule: LoanScheduleEntry[]
): LoanScheduleEntry | null {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  const unpaid = schedule.find(
    (s) =>
      s.status !== 'PAID' &&
      Number(s.paid_amount || 0) < Number(s.total_due || 0)
  );
  return unpaid || null;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Your application is under review';
    case 'APPROVED':
      return 'Your loan has been approved';
    case 'DISBURSED':
      return 'Your loan is being disbursed';
    case 'ACTIVE':
      return 'You have an active loan';
    case 'OVERDUE':
      return 'You have an overdue loan';
    default:
      return 'Your profile is complete';
  }
}

/* ------------------------------------------------------------------ */
/*  Circular progress ring                                             */
/* ------------------------------------------------------------------ */
function ProgressRing({
  value,
  size = 56,
  stroke = 6,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(91,46,140,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#5b2e8c"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[13px] font-bold leading-none tracking-tight text-plum-800">
          {value}%
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KYC banner                                                         */
/* ------------------------------------------------------------------ */
/**
 * Persistent banner shown above the hero when KYC is not verified.
 * Coexists with the modal — this stays, the modal dismisses.
 * Hidden entirely when the modal is currently open, to avoid
 * stacking two KYC prompts on top of each other.
 */
function KycBanner({
  data,
  hidden,
  onOpenModal,
}: {
  data: KycStatusResponse | null;
  hidden: boolean;
  onOpenModal: () => void;
}) {
  if (!data || data.kycStatus === 'VERIFIED' || hidden) return null;

  const { kycStatus, progress, rejectionReason } = data;

  const config =
    kycStatus === 'REJECTED'
      ? {
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-700',
          eyebrowColor: 'text-red-700/80',
          titleColor: 'text-red-900',
          bodyColor: 'text-red-800/90',
          ctaBg: 'bg-red-600',
          ctaText: 'text-white',
          icon: <ShieldAlert size={16} strokeWidth={2.4} />,
          eyebrow: 'Action needed',
          title: 'Your KYC was rejected',
          body: rejectionReason || 'Please review your details and submit again.',
          cta: 'Fix now',
        }
      : kycStatus === 'SUBMITTED'
      ? {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-700',
          eyebrowColor: 'text-blue-700/80',
          titleColor: 'text-blue-900',
          bodyColor: 'text-blue-800/90',
          ctaBg: 'bg-white',
          ctaText: 'text-blue-800',
          icon: <Clock3 size={16} strokeWidth={2.4} />,
          eyebrow: 'Under review',
          title: 'Your KYC is being reviewed',
          body: 'We will notify you once it is approved.',
          cta: null,
        }
      : {
          // PENDING
          bg: 'bg-brand-500/15',
          border: 'border-brand-500/40',
          iconBg: 'bg-brand-500/30',
          iconColor: 'text-plum-800',
          eyebrowColor: 'text-plum-800/70',
          titleColor: 'text-plum-800',
          bodyColor: 'text-plum-800/80',
          ctaBg: 'bg-plum-800',
          ctaText: 'text-white',
          icon: <ShieldAlert size={16} strokeWidth={2.4} />,
          eyebrow: 'KYC required',
          title: 'Complete your KYC to unlock borrowing',
          body: `${progress.filled} of ${progress.total} fields done`,
          cta: 'Complete KYC',
        };

  const handleClick = () => {
    if (config.cta) {
      window.location.href = '/kyc';
    } else {
      onOpenModal();
    }
  };

  return (
    <div className="px-3 pt-3">
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-3 rounded-2xl border ${config.border} ${config.bg} px-4 py-3.5 text-left transition active:scale-[0.99]`}
      >
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${config.iconBg} ${config.iconColor}`}
        >
          {config.icon}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${config.eyebrowColor}`}
          >
            {config.eyebrow}
          </p>
          <p
            className={`mt-0.5 truncate text-[13.5px] font-bold tracking-tight ${config.titleColor}`}
          >
            {config.title}
          </p>
          {kycStatus !== 'SUBMITTED' && (
            <p className={`mt-0.5 text-[11px] ${config.bodyColor}`}>
              {config.body}
            </p>
          )}
        </div>

        {/* Small progress ring on the right — only for PENDING / REJECTED */}
        {kycStatus !== 'SUBMITTED' && (
          <div className="shrink-0">
            <ProgressRing value={progress.percentage} size={44} stroke={4} />
          </div>
        )}

        {config.cta && (
          <div
            className={`hidden sm:inline-flex shrink-0 items-center gap-1 rounded-lg ${config.ctaBg} ${config.ctaText} px-3 py-1.5 text-[11px] font-bold tracking-tight`}
          >
            {config.cta}
            <ChevronRight size={13} strokeWidth={2.6} />
          </div>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */
function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick?: () => void };
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        {title}
      </h2>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[12px] font-semibold tracking-tight text-plum-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar dropdown                                                    */
/* ------------------------------------------------------------------ */
function AvatarMenu({
  initials,
  name,
  email,
  onLogout,
  loggingOut,
}: {
  initials: string;
  name: string;
  email: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/20 transition active:scale-95"
      >
        {initials}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-plum-800 bg-brand-500" />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-60 origin-top-left overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_18px_40px_-20px_rgba(15,21,18,0.35)]"
          >
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="truncate text-[13px] font-bold tracking-tight text-ink-950">
                {name}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-ink-400">
                {email}
              </p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => go('/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40"
            >
              <User size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">
                My profile
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => go('/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40"
            >
              <Settings size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">
                Settings
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => go('/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40"
            >
              <HelpCircle size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">
                Help & support
              </span>
            </button>
            <div className="border-t border-ink-100" />
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-red-50 disabled:opacity-60"
            >
              <LogOut size={16} strokeWidth={2.2} className="shrink-0 text-red-600" />
              <span className="text-[12.5px] font-bold text-red-600">
                {loggingOut ? 'Logging out…' : 'Log out'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading state                                                      */
/* ------------------------------------------------------------------ */
function LoadingState() {
  return (
    <div className="min-h-screen bg-page">
      <div className="sticky top-0 z-30 bg-plum-700">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2.5 w-20 animate-pulse rounded bg-white/10" />
            <div className="h-3.5 w-32 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>
      <div className="px-3 pt-3">
        <div className="h-16 animate-pulse rounded-2xl bg-ink-100/40" />
      </div>
      <div className="px-3 pt-3">
        <div className="h-44 animate-pulse rounded-3xl bg-ink-100/40" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home page                                                          */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const router = useRouter();

  const [borrower, setBorrower] = useState<BorrowerProfile | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<LoanScheduleEntry[]>([]);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meRes, eligRes, activeLoansRes, recentLoansRes, kycRes] =
          await Promise.allSettled([
            imara.me(),
            loansApi.getEligibility(),
            loansApi.getLoans({ status: 'ACTIVE', limit: 1 }),
            loansApi.getLoans({ limit: 20 }),
            getKycStatus(),
          ]);

        if (cancelled) return;

        if (meRes.status === 'fulfilled') {
          setBorrower(meRes.value.data);
        } else {
          const err = meRes.reason;
          if (!(err instanceof ImaraApiError)) {
            console.error('Failed to load borrower profile:', err);
          }
          setLoading(false);
          return;
        }

        if (eligRes.status === 'fulfilled') {
          setEligibility(eligRes.value.data);
        } else if (!(eligRes.reason instanceof ImaraApiError)) {
          console.error('Eligibility fetch failed:', eligRes.reason);
        }

        let active: Loan | null = null;
        if (activeLoansRes.status === 'fulfilled') {
          const list = activeLoansRes.value.data || [];
          active = list.length > 0 ? list[0] : null;
          setActiveLoan(active);
        } else if (!(activeLoansRes.reason instanceof ImaraApiError)) {
          console.error('Active loan fetch failed:', activeLoansRes.reason);
        }

        if (recentLoansRes.status === 'fulfilled') {
          setRecentLoans(recentLoansRes.value.data || []);
        } else if (!(recentLoansRes.reason instanceof ImaraApiError)) {
          console.error('Recent loans fetch failed:', recentLoansRes.reason);
        }

        if (kycRes.status === 'fulfilled') {
          const kyc = kycRes.value;
          setKycData(kyc);

          if (kyc.kycStatus !== 'VERIFIED') {
            let dismissed = false;
            try {
              dismissed =
                window.sessionStorage.getItem(kycDismissKey(kyc)) === '1';
            } catch {
              dismissed = false;
            }
            if (!dismissed) {
              setTimeout(() => {
                if (!cancelled) setShowKycModal(true);
              }, 400);
            }
          }
        } else {
          if (!(kycRes.reason instanceof ImaraApiError)) {
            console.error('KYC status fetch failed:', kycRes.reason);
          }
        }

        if (active) {
          try {
            const detail = await loansApi.getLoan(active.id);
            if (!cancelled) {
              setActiveSchedule(detail.data.schedule || []);
            }
          } catch (err) {
            if (!(err instanceof ImaraApiError)) {
              console.error('Schedule fetch failed:', err);
            }
          }
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (!(err instanceof ImaraApiError)) {
          console.error('Home page load failed:', err);
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await imara.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      try {
        window.sessionStorage.removeItem('imara.apply.draft.v1');
        Object.keys(window.sessionStorage)
          .filter((k) => k.startsWith(KYC_DISMISS_PREFIX))
          .forEach((k) => window.sessionStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      router.push('/login');
    }
  }

  function dismissKycModal() {
    try {
      window.sessionStorage.setItem(kycDismissKey(kycData), '1');
    } catch {
      /* ignore */
    }
    setShowKycModal(false);
  }

  function openKycModal() {
    setShowKycModal(true);
  }

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

    const availableLimit = eligibility?.credit_limit
      ? eligibility.credit_limit.available_limit
      : '0';

    const progress = activeLoan ? computeProgress(activeLoan) : 0;

    const nextInst =
      activeSchedule.length > 0 ? nextInstallment(activeSchedule) : null;

    const nextPaymentAmount = nextInst
      ? nextInst.total_due
      : activeLoan?.outstanding_total || '0';

    const nextPaymentDate = nextInst
      ? nextInst.due_date
      : activeLoan
      ? loanDueDate(activeLoan)
      : null;

    return {
      displayName,
      initials,
      availableLimit,
      progress,
      nextPaymentAmount,
      nextPaymentDate,
    };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (loading || !borrower || !derived) {
    return <LoadingState />;
  }

  const blockingLoan =
    recentLoans.find((l) =>
      (BLOCKING_STATUSES as readonly string[]).includes(l.status)
    ) || null;

  const loanActive = activeLoan !== null;
  const hasBlockingLoan = blockingLoan !== null;

  const kycVerified = kycData?.kycStatus === 'VERIFIED';
  const kycNotVerified = !!kycData && kycData.kycStatus !== 'VERIFIED';

  const canApply = !hasBlockingLoan && kycVerified;

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* ============ NAV ============ */}
      <div className="sticky top-0 z-30 bg-plum-700">
        <div className="flex items-center gap-3 px-5 py-4">
          <AvatarMenu
            initials={derived.initials}
            name={derived.displayName}
            email={borrower.email}
            onLogout={onLogout}
            loggingOut={loggingOut}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Welcome back
            </p>
            <h1 className="mt-0.5 truncate text-[16px] font-semibold tracking-tight text-white">
              {derived.displayName}
            </h1>
          </div>

          <Link
            href="/notifications"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={2.2} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-plum-700" />
          </Link>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ KYC BANNER ============ */}
      {/* Persistent prompt. Hidden when the modal is currently open
          so we do not stack two KYC UI elements. */}
      <KycBanner
        data={kycData}
        hidden={showKycModal}
        onOpenModal={openKycModal}
      />

      {/* ============ HERO — active loan ============ */}
      {loanActive && activeLoan && (
        <div className="px-3 pt-3">
          <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 pt-5 pb-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                  Outstanding balance
                </p>
                <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
                  KES {formatKes(activeLoan.outstanding_total)}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-plum-800/60">
                  of KES {formatKes(activeLoan.principal_amount)} principal
                </p>
              </div>

              <ProgressRing value={derived.progress} />
            </div>

            <div className="my-4 h-px bg-plum-800/10" />

            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-800/10 text-plum-800">
                <Clock3 size={16} strokeWidth={2.2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-plum-800/60">
                  Next payment
                </p>
                <p className="mt-0.5 truncate text-[14px] font-bold tracking-tight text-plum-800 tabular-nums">
                  KES {formatKes(derived.nextPaymentAmount)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-plum-800/60">
                  Due
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[12px] font-semibold text-plum-800/90">
                  {formatDate(derived.nextPaymentDate)}
                </p>
              </div>
            </div>

            <Link
              href={`/repay/${activeLoan.id}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
            >
              Repay now
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}

      {/* ============ HERO — no active loan ============ */}
      {!loanActive && (
        <div className="px-3 pt-3">
          <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 pt-5 pb-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                  Available to borrow
                </p>
                <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
                  KES {formatKes(derived.availableLimit)}
                </p>
              </div>

              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-plum-800/10 text-plum-800">
                <WalletCards size={19} strokeWidth={2.2} />
              </div>
            </div>

            <div className="my-4 h-px bg-plum-800/10" />

            <div className="flex items-center gap-2 text-[12px] font-medium text-plum-800/70">
              <CheckCircle2 size={15} strokeWidth={2.2} />
              <span>
                {kycNotVerified
                  ? 'Complete your KYC to unlock borrowing'
                  : hasBlockingLoan
                  ? statusLabel(blockingLoan!.status)
                  : 'Your profile is complete'}
              </span>
            </div>

            {canApply ? (
              <Link
                href="/apply/loan"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
              >
                Apply for a loan
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            ) : kycNotVerified ? (
              <Link
                href="/kyc"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
              >
                Complete your KYC
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            ) : (
              <Link
                href="/loans"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
              >
                View my loan
                <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ============ VIEW FULL LOAN row ============ */}
      {loanActive && activeLoan && (
        <Link
          href={`/loans/${activeLoan.id}`}
          className="mt-3 flex w-full items-center justify-between gap-3 border-b border-ink-100 bg-white px-5 py-4 text-left transition active:bg-ink-100/40"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              View full loan
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold tracking-tight text-ink-950">
              Schedule &amp; repayments
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-400" strokeWidth={2.2} />
        </Link>
      )}

      {/* ============ QUICK ACTIONS ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Quick actions" />
        <div
          className={`grid gap-3 px-4 py-5 ${
            canApply ? 'grid-cols-4' : 'grid-cols-3'
          }`}
        >
          {canApply && (
            <QuickAction
              href="/apply/loan"
              icon={<Plus size={19} />}
              label="Apply"
            />
          )}
          <QuickAction
            href="/loans"
            icon={<CreditCard size={19} />}
            label="Statement"
          />
          <QuickAction
            href="/loans"
            icon={<History size={19} />}
            label="History"
          />
          <QuickAction
            href="/profile"
            icon={<HelpCircle size={19} />}
            label="Help"
          />
        </div>
      </section>

      {/* ============ RECENT ACTIVITY ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader
          title="Recent activity"
          action={
            recentLoans.length > 0
              ? { label: 'View all', onClick: () => router.push('/loans') }
              : undefined
          }
        />

        {recentLoans.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ink-100/60 text-ink-400">
              <Receipt size={20} strokeWidth={2} />
            </div>
            <p className="mt-3 text-[13px] font-semibold tracking-tight text-ink-800">
              No activity yet
            </p>
            <p className="mt-1 text-[11.5px] font-medium text-ink-400">
              Your loan activity will appear here.
            </p>
          </div>
        ) : (
          recentLoans.slice(0, 5).map((loan, idx) => {
            const isMoneyIn =
              loan.status === 'APPROVED' ||
              loan.status === 'DISBURSED' ||
              loan.status === 'ACTIVE' ||
              loan.status === 'OVERDUE';

            const isSettled = loan.status === 'PAID';

            const isFailed =
              loan.status === 'REJECTED' ||
              loan.status === 'DEFAULTED' ||
              loan.status === 'WRITTEN_OFF';

            const titleMap: Record<string, string> = {
              PENDING: 'Loan application',
              APPROVED: 'Loan approved',
              REJECTED: 'Loan declined',
              DISBURSED: 'Loan disbursed',
              ACTIVE: 'Loan active',
              OVERDUE: 'Loan overdue',
              PAID: 'Loan repaid',
              DEFAULTED: 'Loan defaulted',
              WRITTEN_OFF: 'Loan written off',
            };

            const title = titleMap[loan.status] || 'Loan';

            let amountLabel = `KES ${formatKes(loan.principal_amount)}`;
            if (isMoneyIn || isSettled) {
              amountLabel = `KES ${formatKes(loan.outstanding_total)}`;
            }

            const iconClass =
              isMoneyIn || isSettled
                ? 'bg-leaf-50 text-leaf-600'
                : isFailed
                ? 'bg-red-50 text-red-600'
                : 'bg-ink-100/60 text-ink-500';

            const amountClass =
              isMoneyIn || isSettled
                ? 'text-leaf-600'
                : isFailed
                ? 'text-red-600'
                : 'text-ink-900';

            const Icon = isMoneyIn || isSettled ? CheckCircle2 : Receipt;

            const dateLabel = formatDate(
              loan.disbursed_at || loan.closed_at || loan.created_at
            );

            const displayed = recentLoans.slice(0, 5);

            return (
              <div
                key={loan.id}
                className={`flex items-center gap-3.5 px-5 py-3.5 ${
                  idx !== displayed.length - 1 ? 'border-b border-ink-100' : ''
                }`}
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${iconClass}`}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold tracking-tight text-ink-950">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                    {dateLabel}
                  </p>
                </div>

                <p
                  className={`shrink-0 text-[13.5px] font-bold tabular-nums tracking-tight ${amountClass}`}
                >
                  {amountLabel}
                </p>
              </div>
            );
          })
        )}
      </section>

      {/* ============ KYC MODAL ============ */}
      <KycModal
        open={showKycModal}
        data={kycData}
        onClose={dismissKycModal}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick action tile                                                  */
/* ------------------------------------------------------------------ */
function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 transition active:scale-95"
    >
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-plum-700 text-white">
        {icon}
      </div>
      <span className="text-[11px] font-semibold tracking-tight text-ink-700">
        {label}
      </span>
    </Link>
  );
}