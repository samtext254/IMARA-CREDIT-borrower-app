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
  Eye,
  EyeOff,
  HelpCircle,
  LogOut,
  Receipt,
  Settings,
  User,
  WalletCards,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  PiggyBank,
  FileText,
  Send,
  Smartphone,
  Banknote,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { imara, ImaraApiError } from '@/lib/api';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { ActivityItem, Eligibility, Loan, LoanScheduleEntry } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';
import KycModal from '@/components/KycModal';

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
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

const BLOCKING_STATUSES = ['PENDING', 'APPROVED', 'DISBURSED', 'ACTIVE', 'OVERDUE'] as const;
const KYC_DISMISS_PREFIX = 'kyc-dismissed';
const HIDE_BALANCE_KEY = 'imara.home.hideBalance';

function kycDismissKey(data: KycStatusResponse | null): string {
  if (!data) return KYC_DISMISS_PREFIX + '-unknown';
  return `${KYC_DISMISS_PREFIX}-${data.kycStatus}-${data.submittedAt || 'na'}`;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function formatKes(amount: string | number | null | undefined): string {
  return Math.round(toNumber(amount)).toLocaleString('en-KE');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Whole days from today to the given date. Negative when in the past. */
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function dueLabel(days: number | null): { text: string; late: boolean } | null {
  if (days === null) return null;
  if (days < 0) return { text: `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`, late: true };
  if (days === 0) return { text: 'Due today', late: false };
  if (days === 1) return { text: 'Due tomorrow', late: false };
  return { text: `Due in ${days} days`, late: false };
}

function computeProgress(loan: Loan): number {
  const principal = toNumber(loan.principal_amount);
  if (principal <= 0) return 0;
  const repaid = Math.max(0, principal - toNumber(loan.outstanding_principal));
  return Math.max(0, Math.min(100, Math.round((repaid / principal) * 100)));
}

function nextInstallment(schedule: LoanScheduleEntry[]): LoanScheduleEntry | null {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  return (
    schedule.find(
      (s) => s.status !== 'PAID' && Number(s.paid_amount || 0) < Number(s.total_due || 0)
    ) || null
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Your application is under review';
    case 'APPROVED': return 'Your loan has been approved';
    case 'DISBURSED': return 'Your loan is being disbursed';
    case 'ACTIVE': return 'You have an active loan';
    case 'OVERDUE': return 'You have an overdue loan';
    default: return 'Your profile is complete';
  }
}

type Tone = 'good' | 'bad' | 'neutral';

function activityRow(item: ActivityItem): { title: string; Icon: typeof CheckCircle2; tone: Tone } {
  switch (item.kind) {
    case 'repayment_received': return { title: 'Repayment received', Icon: CheckCircle2, tone: 'good' };
    case 'loan_submitted': return { title: 'Loan application', Icon: Receipt, tone: 'neutral' };
    case 'loan_approved': return { title: 'Loan approved', Icon: CheckCircle2, tone: 'good' };
    case 'loan_rejected': return { title: 'Loan declined', Icon: Receipt, tone: 'bad' };
    case 'loan_disbursed': return { title: 'Loan disbursed', Icon: WalletCards, tone: 'neutral' };
    case 'loan_active': return { title: 'Loan active', Icon: CheckCircle2, tone: 'good' };
    case 'loan_overdue': return { title: 'Loan overdue', Icon: AlertTriangle, tone: 'bad' };
    case 'loan_paid': return { title: 'Loan fully repaid', Icon: CheckCircle2, tone: 'good' };
    case 'loan_defaulted':
    case 'loan_written_off': return { title: 'Loan closed', Icon: Receipt, tone: 'bad' };
    default: return { title: 'Loan update', Icon: Receipt, tone: 'neutral' };
  }
}

const TONE_ICON: Record<Tone, string> = {
  good: 'bg-leaf-50 text-leaf-600',
  bad: 'bg-red-50 text-red-600',
  neutral: 'bg-ink-100/60 text-ink-500',
};
const TONE_AMOUNT: Record<Tone, string> = {
  good: 'text-leaf-600',
  bad: 'text-red-600',
  neutral: 'text-ink-900',
};

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

/* ------------------------------------------------------------------ */
/*  Small pieces                                                       */
/* ------------------------------------------------------------------ */
function Amount({
  value,
  hidden,
  className = '',
}: {
  value: string | number;
  hidden: boolean;
  className?: string;
}) {
  return (
    <p className={`flex items-baseline gap-1.5 tabular-nums ${className}`}>
      <span className="text-[15px] font-medium opacity-70">KES</span>
      <span className="text-[40px] font-semibold leading-none tracking-[-0.03em]">
        {hidden ? '••••••' : formatKes(value)}
      </span>
    </p>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function CtaButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 text-[15px] font-semibold text-plum-800 transition active:scale-[0.985] ${FOCUS}`}
    >
      {children}
      <ArrowRight size={17} strokeWidth={2.4} />
    </Link>
  );
}

function ListRow({ href, title, hint }: { href: string; title: string; hint?: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 border-y border-ink-100 py-4 transition active:bg-ink-100/30 ${FOCUS}`}
    >
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold text-ink-950">{title}</p>
        {hint && <p className="mt-0.5 text-[12.5px] text-ink-400">{hint}</p>}
      </div>
      <ChevronRight size={18} strokeWidth={2.2} className="shrink-0 text-ink-400" />
    </Link>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-2 rounded-xl text-center transition active:scale-95 ${FOCUS}`}
    >
      <div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-plum-50 text-plum-700">
        {icon}
      </div>
      <span className="text-[12px] font-medium leading-tight text-ink-800">{label}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  KYC status strip (only for rejected / under review)                */
/* ------------------------------------------------------------------ */
function KycStrip({
  data,
  hidden,
  onOpenModal,
}: {
  data: KycStatusResponse | null;
  hidden: boolean;
  onOpenModal: () => void;
}) {
  if (!data || hidden) return null;
  if (data.kycStatus !== 'REJECTED' && data.kycStatus !== 'SUBMITTED') return null;

  const rejected = data.kycStatus === 'REJECTED';
  const inner = (
    <>
      {rejected ? (
        <ShieldAlert size={18} strokeWidth={2.2} className="shrink-0" />
      ) : (
        <Clock3 size={18} strokeWidth={2.2} className="shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold">
          {rejected ? 'Your verification was rejected' : 'Verification in review'}
        </p>
        <p className="mt-0.5 truncate text-[12px] opacity-80">
          {rejected
            ? data.rejectionReason || 'Review your details and submit again.'
            : 'We will notify you once it is approved.'}
        </p>
      </div>
      <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 opacity-70" />
    </>
  );
  const cls = `mb-6 flex items-center gap-3 rounded-2xl px-4 py-3.5 ${FOCUS} ${
    rejected ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'
  }`;

  return rejected ? (
    <Link href="/kyc" className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onOpenModal} className={`${cls} w-full text-left`}>
      {inner}
    </button>
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

  const item =
    'flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-ink-100/40';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className={`grid h-11 w-11 place-items-center rounded-full bg-white/15 text-[14px] font-semibold text-white transition active:scale-95 ${FOCUS}`}
      >
        {initials}
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
            className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_18px_40px_-20px_rgba(15,21,18,0.35)]"
          >
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="truncate text-[13.5px] font-semibold text-ink-950">{name}</p>
              <p className="mt-0.5 truncate text-[12px] text-ink-400">{email}</p>
            </div>
            <button type="button" role="menuitem" onClick={() => go('/profile')} className={item}>
              <User size={17} strokeWidth={2.2} className="text-ink-500" />
              <span className="text-[13.5px] font-medium text-ink-800">My profile</span>
            </button>
            <button type="button" role="menuitem" onClick={() => go('/profile')} className={item}>
              <Settings size={17} strokeWidth={2.2} className="text-ink-500" />
              <span className="text-[13.5px] font-medium text-ink-800">Settings</span>
            </button>
            <button type="button" role="menuitem" onClick={() => go('/profile')} className={item}>
              <HelpCircle size={17} strokeWidth={2.2} className="text-ink-500" />
              <span className="text-[13.5px] font-medium text-ink-800">Help &amp; support</span>
            </button>
            <div className="border-t border-ink-100" />
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              disabled={loggingOut}
              className={`${item} disabled:opacity-60`}
            >
              <LogOut size={17} strokeWidth={2.2} className="text-red-600" />
              <span className="text-[13.5px] font-semibold text-red-600">
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
/*  Loading + error states                                             */
/* ------------------------------------------------------------------ */
function LoadingState() {
  return (
    <div className="min-h-screen bg-white" aria-busy="true">
      <div className="bg-plum-800 px-5 pb-14 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 animate-pulse rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-2.5 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-3.5 w-32 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="mt-8 h-3 w-28 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-10 w-52 animate-pulse rounded bg-white/10" />
        <div className="mt-6 h-[52px] w-full animate-pulse rounded-2xl bg-white/10" />
      </div>
      <div className="-mt-6 rounded-t-[28px] bg-white px-5 pt-6">
        <div className="grid grid-cols-3 gap-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mx-auto h-[52px] w-[52px] animate-pulse rounded-full bg-ink-100/50" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-8 text-center">
      <div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-plum-50 text-plum-700">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <h1 className="mt-5 text-[18px] font-semibold text-ink-950">We couldn’t load your account</h1>
        <p className="mt-2 text-[14px] text-ink-500">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={`mt-6 h-12 rounded-2xl bg-plum-800 px-8 text-[14.5px] font-semibold text-white transition active:scale-[0.985] ${FOCUS}`}
        >
          Try again
        </button>
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
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);

  useEffect(() => {
    try {
      setHideBalance(window.localStorage.getItem(HIDE_BALANCE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  function toggleBalance() {
    setHideBalance((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(HIDE_BALANCE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meRes, eligRes, activeLoansRes, recentLoansRes, kycRes, activityRes] =
          await Promise.allSettled([
            imara.me(),
            loansApi.getEligibility(),
            loansApi.getLoans({ status: 'ACTIVE', limit: 1 }),
            loansApi.getLoans({ limit: 20 }),
            getKycStatus(),
            loansApi.getActivity({ limit: 20 }),
          ]);

        if (cancelled) return;

        if (meRes.status === 'fulfilled') {
          setBorrower(meRes.value.data);
        } else {
          if (!(meRes.reason instanceof ImaraApiError)) {
            console.error('Failed to load borrower profile:', meRes.reason);
          }
          setFailed(true);
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

        if (activityRes.status === 'fulfilled') {
          setActivity(activityRes.value.data || []);
        } else if (!(activityRes.reason instanceof ImaraApiError)) {
          console.error('Activity fetch failed:', activityRes.reason);
        }

        if (kycRes.status === 'fulfilled') {
          const kyc = kycRes.value;
          setKycData(kyc);

          if (kyc.kycStatus !== 'VERIFIED') {
            let dismissed = false;
            try {
              dismissed = window.sessionStorage.getItem(kycDismissKey(kyc)) === '1';
            } catch {
              dismissed = false;
            }
            if (!dismissed) {
              setTimeout(() => {
                if (!cancelled) setShowKycModal(true);
              }, 400);
            }
          }
        } else if (!(kycRes.reason instanceof ImaraApiError)) {
          console.error('KYC status fetch failed:', kycRes.reason);
        }

        if (active) {
          try {
            const detail = await loansApi.getLoan(active.id);
            if (!cancelled) setActiveSchedule(detail.data.schedule || []);
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
        setFailed(true);
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

  const derived = useMemo(() => {
    if (!borrower) return null;

    const fullName = [borrower.first_name, borrower.last_name].filter(Boolean).join(' ').trim();
    const displayName = fullName || borrower.email.split('@')[0];
    const firstName = borrower.first_name || displayName.split(/\s+/)[0];
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
    const nextInst = activeSchedule.length > 0 ? nextInstallment(activeSchedule) : null;
    const penaltyOutstanding = activeLoan
      ? toNumber((activeLoan as any).outstanding_penalty)
      : 0;
    const loanOutstanding = activeLoan ? toNumber(activeLoan.outstanding_total) : 0;
    const instalmentDue = nextInst ? toNumber(nextInst.total_due) : null;
    const nextPaymentAmount =
      instalmentDue !== null ? instalmentDue + penaltyOutstanding : loanOutstanding;
    const nextPaymentDate = nextInst
      ? nextInst.due_date
      : activeLoan
      ? loanDueDate(activeLoan)
      : null;

    return {
      displayName,
      firstName,
      initials,
      availableLimit,
      progress,
      nextPaymentAmount,
      nextPaymentDate,
      penaltyOutstanding,
    };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (failed && !borrower) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  if (loading || !borrower || !derived) {
    return <LoadingState />;
  }

  const blockingLoan =
    recentLoans.find((l) => (BLOCKING_STATUSES as readonly string[]).includes(l.status)) || null;

  const loanActive = activeLoan !== null;
  const hasBlockingLoan = blockingLoan !== null;
  const focusLoan = activeLoan || blockingLoan;
  const focusLoanIsOverdue = focusLoan?.status === 'OVERDUE';
  const focusLoanIsRepayable = focusLoan?.status === 'ACTIVE' || focusLoan?.status === 'OVERDUE';

  const kycVerified = kycData?.kycStatus === 'VERIFIED';
  const kycNotVerified = !!kycData && kycData.kycStatus !== 'VERIFIED';
  const kycInReview = kycData?.kycStatus === 'SUBMITTED';
  const canApply = !hasBlockingLoan && kycVerified;
  const hasPenalty = derived.penaltyOutstanding > 0;
  const due = dueLabel(daysUntil(derived.nextPaymentDate));

  /* One primary action for the hero, resolved in priority order. */
  let cta: { href: string; label: string } | null;
  if (loanActive && activeLoan) {
    cta = focusLoanIsRepayable
      ? { href: `/repay/${activeLoan.id}`, label: focusLoanIsOverdue ? 'Pay overdue loan' : 'Pay now' }
      : { href: `/loans/${activeLoan.id}`, label: 'View loan' };
  } else if (focusLoan && focusLoanIsRepayable) {
    cta = {
      href: `/repay/${focusLoan.id}`,
      label: focusLoanIsOverdue ? 'View and pay overdue loan' : 'Pay my loan',
    };
  } else if (hasBlockingLoan && blockingLoan) {
    cta = { href: `/loans/${blockingLoan.id}`, label: 'View my loan' };
  } else if (canApply) {
    cta = { href: '/apply/loan', label: 'Apply for a loan' };
  } else if (kycNotVerified) {
    cta = kycInReview ? null : { href: '/kyc', label: 'Verify your identity' };
  } else {
    cta = { href: '/loans', label: 'View my loans' };
  }

  const blockingOverdue = !loanActive && hasBlockingLoan && blockingLoan!.status === 'OVERDUE';
  const statusLine = blockingOverdue
    ? 'You have an overdue loan. Pay now to avoid further fees.'
    : kycNotVerified
    ? kycInReview
      ? 'Your identity check is in review'
      : 'Verify your identity to unlock borrowing'
    : hasBlockingLoan
    ? statusLabel(blockingLoan!.status)
    : 'Your profile is complete';

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* ============ HEADER + HERO (one surface) ============ */}
      <header className="bg-plum-800 px-5 pb-14 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
        <div className="flex items-center gap-3">
          <AvatarMenu
            initials={derived.initials}
            name={derived.displayName}
            email={borrower.email}
            onLogout={onLogout}
            loggingOut={loggingOut}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-white/60">{greeting()}</p>
            <h1 className="truncate text-[17px] font-semibold tracking-tight">
              {derived.firstName}
            </h1>
          </div>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/10 transition active:scale-95 ${FOCUS}`}
          >
            <Bell size={19} strokeWidth={2.2} />
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-plum-800" />
          </Link>
        </div>

        {loanActive && activeLoan ? (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] text-white/60">Outstanding balance</p>
              <button
                type="button"
                onClick={toggleBalance}
                aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                className={`grid h-9 w-9 place-items-center rounded-full text-white/70 transition active:scale-95 ${FOCUS}`}
              >
                {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Amount value={activeLoan.outstanding_total} hidden={hideBalance} className="mt-1" />
            <p className="mt-2 text-[13px] text-white/60">
              of KES {hideBalance ? '••••' : formatKes(activeLoan.total_due)} total
            </p>

            <div className="mt-5">
              <ProgressBar value={derived.progress} />
              <p className="mt-2 text-[12.5px] text-white/70">{derived.progress}% repaid</p>
            </div>

            <dl className="mt-5 grid grid-cols-2 divide-x divide-white/10 rounded-2xl bg-white/[0.07] py-3.5">
              <div className="px-4">
                <dt className="text-[12px] text-white/60">Next payment</dt>
                <dd className="mt-1 text-[16px] font-semibold tabular-nums">
                  KES {hideBalance ? '••••' : formatKes(derived.nextPaymentAmount)}
                </dd>
              </div>
              <div className="px-4">
                <dt className="text-[12px] text-white/60">Due date</dt>
                <dd className="mt-1 text-[16px] font-semibold">
                  {formatDate(derived.nextPaymentDate)}
                </dd>
                {due && (
                  <p className={`mt-0.5 text-[12px] font-medium ${due.late ? 'text-red-200' : 'text-brand-500'}`}>
                    {due.text}
                  </p>
                )}
              </div>
            </dl>

            {focusLoanIsOverdue && hasPenalty && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-red-500/20 px-4 py-3 text-[13px] leading-snug text-red-100">
                <AlertTriangle size={16} strokeWidth={2.4} className="mt-0.5 shrink-0" />
                <p>
                  A late fee of KES {formatKes(derived.penaltyOutstanding)} has been added to your
                  balance.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] text-white/60">Available to borrow</p>
              <button
                type="button"
                onClick={toggleBalance}
                aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                className={`grid h-9 w-9 place-items-center rounded-full text-white/70 transition active:scale-95 ${FOCUS}`}
              >
                {hideBalance ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Amount value={derived.availableLimit} hidden={hideBalance} className="mt-1" />

            <p className="mt-4 flex items-start gap-2 text-[13.5px] leading-snug text-white/80">
              {blockingOverdue ? (
                <AlertTriangle size={16} strokeWidth={2.2} className="mt-0.5 shrink-0 text-red-200" />
              ) : (
                <CheckCircle2 size={16} strokeWidth={2.2} className="mt-0.5 shrink-0" />
              )}
              {statusLine}
            </p>

            {kycNotVerified && !kycInReview && kycData && (
              <div className="mt-4">
                <ProgressBar value={kycData.progress.percentage} />
                <p className="mt-2 text-[12.5px] text-white/70">
                  {kycData.progress.filled} of {kycData.progress.total} details completed
                </p>
              </div>
            )}
          </div>
        )}

        {cta && <CtaButton href={cta.href}>{cta.label}</CtaButton>}
      </header>

      {/* ============ WHITE SHEET ============ */}
      <main className="-mt-6 rounded-t-[28px] bg-white px-5 pt-7">
        <KycStrip data={kycData} hidden={showKycModal} onOpenModal={() => setShowKycModal(true)} />

        {/* Quick actions */}
        <section aria-labelledby="qa-title">
          <h2 id="qa-title" className="mb-5 text-[16px] font-semibold tracking-tight text-ink-950">
            Quick actions
          </h2>
          <div className="grid grid-cols-3 gap-y-6">
            <QuickAction href="/savings" icon={<PiggyBank size={21} strokeWidth={2} />} label="Savings" />
            <QuickAction href="/loans" icon={<FileText size={21} strokeWidth={2} />} label="Statement" />
            <QuickAction href="/send-money" icon={<Send size={21} strokeWidth={2} />} label="Send money" />
            <QuickAction href="/pay-bills" icon={<Receipt size={21} strokeWidth={2} />} label="Pay bills" />
            <QuickAction href="/airtime" icon={<Smartphone size={21} strokeWidth={2} />} label="Buy airtime" />
            <QuickAction href="/loans" icon={<Banknote size={21} strokeWidth={2} />} label="My loans" />
          </div>
        </section>

        {/* Loan link */}
        {loanActive && activeLoan && (
          <section className="mt-8">
            <ListRow
              href={`/loans/${activeLoan.id}`}
              title="Schedule and repayments"
              hint="See every instalment and what you have paid"
            />
          </section>
        )}

        {/* Recent activity */}
        <section className="mt-9" aria-labelledby="activity-title">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="activity-title" className="text-[16px] font-semibold tracking-tight text-ink-950">
              Recent activity
            </h2>
            {activity.length > 0 && (
              <Link href="/notifications" className={`rounded-md text-[13.5px] font-semibold text-plum-700 ${FOCUS}`}>
                View all
              </Link>
            )}
          </div>

          {activity.length === 0 ? (
            <div className="border-t border-ink-100 py-10 text-center">
              <p className="text-[14.5px] font-semibold text-ink-800">No activity yet</p>
              <p className="mt-1 text-[13px] text-ink-400">
                Your loan activity will appear here.
              </p>
            </div>
          ) : (
            <ul>
              {activity.slice(0, 5).map((item, idx, arr) => {
                const row = activityRow(item);
                const last = idx === arr.length - 1;
                return (
                  <li
                    key={`${item.kind}-${item.loan_id}-${item.at}`}
                    className={`flex items-center gap-3.5 py-4 ${last ? '' : 'border-b border-ink-100'}`}
                  >
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${TONE_ICON[row.tone]}`}
                    >
                      <row.Icon size={19} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink-950">{row.title}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-400">
                        {formatDate(item.at)}
                        {item.receipt ? ` · ${item.receipt}` : ''}
                      </p>
                    </div>
                    {item.amount != null && (
                      <p className={`shrink-0 text-[14.5px] font-semibold tabular-nums ${TONE_AMOUNT[row.tone]}`}>
                        KES {hideBalance ? '••••' : formatKes(item.amount)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Trust footer */}
        <p className="mt-10 flex items-center justify-center gap-1.5 pb-2 text-[12px] text-ink-400">
          <ShieldCheck size={14} strokeWidth={2.2} />
          Your information is encrypted and protected
        </p>
      </main>

      {/* ============ KYC MODAL ============ */}
      <KycModal open={showKycModal} onClose={dismissKycModal} data={kycData} />
    </div>
  );
}