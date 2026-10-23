'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Bell, CheckCircle2, ChevronRight, Clock3, HelpCircle, LogOut,
  Receipt, Settings, User, WalletCards, ShieldAlert, AlertTriangle,
  ArrowLeftRight, FileText, Smartphone, PiggyBank, TrendingUp, LayoutGrid,
  Banknote, Home as HomeIcon, Car, Briefcase, Coins, GraduationCap, X
} from 'lucide-react';
import { imara, ImaraApiError } from '@/lib/api';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { ActivityItem, Eligibility, Loan, LoanScheduleEntry, LoanProduct } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';
import KycModal from '@/components/KycModal';

/* ------------------------------------------------------------------ */
/*  Types & Helpers                                                    */
/* ------------------------------------------------------------------ */
interface BorrowerProfile {
  borrower_id: number; merchant_id: number; email: string; first_name: string | null;
  last_name: string | null; phone: string | null; status: string;
  email_verified: boolean; created_at: string;
}

const BLOCKING_STATUSES = ['PENDING', 'APPROVED', 'DISBURSED', 'ACTIVE', 'OVERDUE'] as const;
const KYC_DISMISS_PREFIX = 'kyc-dismissed';

function kycDismissKey(data: KycStatusResponse | null): string {
  if (!data) return KYC_DISMISS_PREFIX + '-unknown';
  return `${KYC_DISMISS_PREFIX}-${data.kycStatus}-${data.submittedAt || 'na'}`;
}
function formatKes(amount: any): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(n) ? '0' : Math.round(n).toLocaleString('en-KE');
}
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function computeProgress(loan: Loan): number {
  const principal = parseFloat(loan.principal_amount || '0');
  const outstanding = parseFloat(loan.outstanding_principal || '0');
  if (!principal || principal <= 0) return 0;
  const pct = ((principal - outstanding) / principal) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
function nextInstallment(schedule: LoanScheduleEntry[]): LoanScheduleEntry | null {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  return schedule.find((s) => s.status !== 'PAID' && Number(s.total_paid || 0) < (Number(s.total_due || 0) + Number(s.penalty_due || 0))) || null;
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
function activityRow(item: ActivityItem): { title: string; Icon: typeof CheckCircle2; iconClass: string; amountClass: string; } {
  switch (item.kind) {
    case 'repayment_received': return { title: 'Repayment received', Icon: CheckCircle2, iconClass: 'bg-leaf-50 text-leaf-600', amountClass: 'text-leaf-600' };
    case 'loan_submitted': return { title: 'Loan application', Icon: Receipt, iconClass: 'bg-ink-100/60 text-ink-500', amountClass: 'text-ink-900' };
    case 'loan_approved': return { title: 'Loan approved', Icon: CheckCircle2, iconClass: 'bg-leaf-50 text-leaf-600', amountClass: 'text-ink-900' };
    case 'loan_rejected': return { title: 'Loan declined', Icon: Receipt, iconClass: 'bg-red-50 text-red-600', amountClass: 'text-red-600' };
    case 'loan_disbursed': return { title: 'Loan disbursed', Icon: WalletCards, iconClass: 'bg-[#EEF3F8] text-[#17365D]', amountClass: 'text-ink-900' };
    case 'loan_active': return { title: 'Loan active', Icon: CheckCircle2, iconClass: 'bg-leaf-50 text-leaf-600', amountClass: 'text-leaf-600' };
    case 'loan_overdue': return { title: 'Loan overdue', Icon: AlertTriangle, iconClass: 'bg-red-50 text-red-600', amountClass: 'text-red-600' };
    case 'loan_paid': return { title: 'Loan fully repaid', Icon: CheckCircle2, iconClass: 'bg-leaf-50 text-leaf-600', amountClass: 'text-leaf-600' };
    case 'loan_defaulted':
    case 'loan_written_off': return { title: 'Loan closed', Icon: Receipt, iconClass: 'bg-red-50 text-red-600', amountClass: 'text-red-600' };
    default: return { title: 'Loan update', Icon: Receipt, iconClass: 'bg-ink-100/60 text-ink-500', amountClass: 'text-ink-900' };
  }
}

/* ------------------------------------------------------------------ */
/*  Circular progress ring                                             */
/* ------------------------------------------------------------------ */
function ProgressRing({ value, size = 56, stroke = 6 }: { value: number; size?: number; stroke?: number; }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#D6A83E" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[13px] font-bold leading-none tracking-tight text-[#D6A83E]">{value}%</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KYC banner                                                         */
/* ------------------------------------------------------------------ */
function KycBanner({ data, hidden, onOpenModal }: { data: KycStatusResponse | null; hidden: boolean; onOpenModal: () => void; }) {
  if (!data || data.kycStatus === 'VERIFIED' || hidden) return null;
  const { kycStatus, progress, rejectionReason } = data;

  const config = kycStatus === 'REJECTED'
      ? { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-700', eyebrowColor: 'text-red-700/80', titleColor: 'text-red-900', bodyColor: 'text-red-800/90', ctaBg: 'bg-red-600', ctaText: 'text-white', icon: <ShieldAlert size={16} strokeWidth={2.4} />, eyebrow: 'Action needed', title: 'Your KYC was rejected', body: rejectionReason || 'Please review your details and submit again.', cta: 'Fix now' }
      : kycStatus === 'SUBMITTED'
      ? { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', eyebrowColor: 'text-blue-700/80', titleColor: 'text-blue-900', bodyColor: 'text-blue-800/90', ctaBg: 'bg-white', ctaText: 'text-blue-800', icon: <Clock3 size={16} strokeWidth={2.4} />, eyebrow: 'Under review', title: 'Your KYC is being reviewed', body: 'We will notify you once it is approved.', cta: null }
      : { bg: 'bg-brand-500/15', border: 'border-brand-500/40', iconBg: 'bg-brand-500/30', iconColor: 'text-[#0B1F3A]', eyebrowColor: 'text-[#0B1F3A]/70', titleColor: 'text-[#0B1F3A]', bodyColor: 'text-[#0B1F3A]/80', ctaBg: 'bg-[#102A4C]', ctaText: 'text-white', icon: <ShieldAlert size={16} strokeWidth={2.4} />, eyebrow: 'KYC required', title: 'Complete your KYC to unlock borrowing', body: `${progress.filled} of ${progress.total} fields done`, cta: 'Complete KYC' };

  const handleClick = () => {
    if (config.cta) window.location.href = '/kyc';
    else onOpenModal();
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <button type="button" onClick={handleClick} className={`flex w-full items-center gap-3 rounded-2xl border ${config.border} ${config.bg} px-4 py-3.5 text-left transition active:scale-[0.99]`}>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${config.iconBg} ${config.iconColor}`}>{config.icon}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${config.eyebrowColor}`}>{config.eyebrow}</p>
          <p className={`mt-0.5 truncate text-[13.5px] font-bold tracking-tight ${config.titleColor}`}>{config.title}</p>
          {kycStatus !== 'SUBMITTED' && <p className={`mt-0.5 text-[11px] ${config.bodyColor}`}>{config.body}</p>}
        </div>
        {kycStatus !== 'SUBMITTED' && <div className="shrink-0"><ProgressRing value={progress.percentage} size={44} stroke={4} /></div>}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar dropdown                                                    */
/* ------------------------------------------------------------------ */
function AvatarMenu({ initials, name, email, onLogout, loggingOut }: { initials: string; name: string; email: string; onLogout: () => void; loggingOut: boolean; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  function go(path: string) { setOpen(false); router.push(path); }

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11">
        {initials}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0B1F3A] bg-brand-500" />
      </button>
      {open && (
        <>
          <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute left-0 top-full z-50 mt-2 w-60 origin-top-left overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_18px_40px_-20px_rgba(15,21,18,0.35)]">
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="truncate text-[13px] font-bold tracking-tight text-ink-950">{name}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-ink-400">{email}</p>
            </div>
            <button type="button" onClick={() => go('/profile')} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40">
              <User size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">My profile</span>
            </button>
            <button type="button" onClick={() => go('/profile')} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40">
              <Settings size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">Settings</span>
            </button>
            <button type="button" onClick={() => go('/profile')} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40">
              <HelpCircle size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">Help & support</span>
            </button>
            <div className="border-t border-ink-100" />
            <button type="button" onClick={onLogout} disabled={loggingOut} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-red-50 disabled:opacity-60">
              <LogOut size={16} strokeWidth={2.2} className="shrink-0 text-red-600" />
              <span className="text-[12.5px] font-bold text-red-600">{loggingOut ? 'Logging out…' : 'Log out'}</span>
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
      <div className="sticky top-0 z-30 bg-[#0B1F3A]">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-2.5 w-20 animate-pulse rounded bg-white/10" />
            <div className="h-3.5 w-32 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="h-1 w-full bg-[#D6A83E]" />
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8"><div className="h-16 animate-pulse rounded-2xl bg-ink-100/40" /></div>
      <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6 lg:px-8"><div className="h-44 animate-pulse rounded-3xl bg-ink-100/40" /></div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Everyday Service Tile                                              */
/* ------------------------------------------------------------------ */
function EverydayServiceTile({ icon: Icon, label, bgClass, textClass, href, onClick }: { icon: any; label: string; bgClass: string; textClass: string; href?: string; onClick?: () => void }) {
  const content = (
    <>
      <div className={`grid h-14 w-14 place-items-center rounded-2xl ring-1 ring-black/[0.03] transition group-hover:-translate-y-0.5 group-active:scale-95 sm:h-16 sm:w-16 ${bgClass} ${textClass}`}>
        <Icon size={24} strokeWidth={2} />
      </div>
      <span className="mt-2 text-center text-[12px] font-semibold text-ink-900 sm:text-[13px]">{label}</span>
    </>
  );
  if (href) return <Link href={href} className="group flex flex-col items-center">{content}</Link>;
  return <button onClick={onClick} className="group flex flex-col items-center">{content}</button>;
}

/* ------------------------------------------------------------------ */
/*  Loan Product Tile                                                  */
/* ------------------------------------------------------------------ */
function LoanProductTile({ product, onApply }: { product: LoanProduct; onApply: (p: LoanProduct) => void; }) {
  let Icon = Banknote;
  const nameUpper = product.name.toUpperCase();
  if (nameUpper.includes('HOME')) Icon = HomeIcon;
  if (nameUpper.includes('CAR')) Icon = Car;
  if (nameUpper.includes('BUSINESS')) Icon = Briefcase;
  if (nameUpper.includes('MICRO')) Icon = Coins;
  if (nameUpper.includes('EDUCATION')) Icon = GraduationCap;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_-18px_rgba(11,31,58,0.35)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[#EEF3F8] text-[#17365D]">
          <Icon size={24} strokeWidth={2} />
        </div>
        <h3 className="text-[13px] font-bold text-ink-950 leading-tight">{product.name}</h3>
      </div>
      <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3">
        <div className="flex justify-between text-[11px]">
          <span className="text-ink-500">Max Loan</span>
          <span className="font-semibold text-ink-900">KES {Number(product.max_amount).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-ink-500">Term</span>
          <span className="font-semibold text-ink-900">{product.min_term_days} - {product.max_term_days} days</span>
        </div>
      </div>
      <button onClick={() => onApply(product)} className="mt-4 w-full rounded-xl bg-[#0B1F3A] px-3 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#17365D] active:scale-[0.98]">
        Apply Now
      </button>
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
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  
  // Modal State
  const [showMoreModal, setShowMoreModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, eligRes, activeLoansRes, recentLoansRes, kycRes, activityRes, prodRes] = await Promise.allSettled([
          imara.me(), loansApi.getEligibility(), loansApi.getLoans({ limit: 5 }), loansApi.getLoans({ limit: 20 }), getKycStatus(), loansApi.getActivity({ limit: 20 }), loansApi.getProducts(),
        ]);
        if (cancelled) return;
        if (meRes.status === 'fulfilled') setBorrower(meRes.value.data);
        else { setLoading(false); return; }
        if (eligRes.status === 'fulfilled') setEligibility(eligRes.value.data);
        
        let active: Loan | null = null;
        if (activeLoansRes.status === 'fulfilled') {
          const list = activeLoansRes.value.data || [];
          active = list.find((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE') || null;
          setActiveLoan(active);
        }
        if (recentLoansRes.status === 'fulfilled') setRecentLoans(recentLoansRes.value.data || []);
        if (activityRes.status === 'fulfilled') setActivity(activityRes.value.data || []);
        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);

        if (kycRes.status === 'fulfilled') {
          const kyc = kycRes.value;
          setKycData(kyc);
          if (kyc.kycStatus !== 'VERIFIED') {
            let dismissed = false;
            try { dismissed = window.sessionStorage.getItem(kycDismissKey(kyc)) === '1'; } catch {}
            if (!dismissed) setTimeout(() => { if (!cancelled) setShowKycModal(true); }, 400);
          }
        }
        if (active) {
          try {
            const detail = await loansApi.getLoan(active.id);
            if (!cancelled) setActiveSchedule(detail.data.schedule || []);
          } catch {}
        }
        if (!cancelled) setLoading(false);
      } catch { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onLogout() {
    setLoggingOut(true);
    try { await imara.logout(); } catch {}
    finally {
      try {
        window.sessionStorage.removeItem('imara.apply.draft.v1');
        Object.keys(window.sessionStorage).filter((k) => k.startsWith(KYC_DISMISS_PREFIX)).forEach((k) => window.sessionStorage.removeItem(k));
      } catch {}
      router.push('/login');
    }
  }

  function dismissKycModal() {
    try { window.sessionStorage.setItem(kycDismissKey(kycData), '1'); } catch {}
    setShowKycModal(false);
  }

  const derived = useMemo(() => {
    if (!borrower) return null;
    const fullName = [borrower.first_name, borrower.last_name].filter(Boolean).join(' ').trim();
    const displayName = fullName || borrower.email.split('@')[0];
    const initials = displayName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const availableLimit = eligibility?.credit_limit ? eligibility.credit_limit.available_limit : '0';
    const progress = activeLoan ? computeProgress(activeLoan) : 0;
    const nextInst = activeSchedule.length > 0 ? nextInstallment(activeSchedule) : null;
    const penaltyOutstanding = activeLoan ? toNumber((activeLoan as any).outstanding_penalty) : 0;
    const loanOutstanding = activeLoan ? toNumber(activeLoan.outstanding_total) : 0;
    let nextPaymentAmount = String(loanOutstanding);
    if (nextInst) {
      const due = Number(nextInst.total_due || 0);
      const paid = Number(nextInst.total_paid || 0);
      const penalty = Number(nextInst.penalty_due || 0);
      nextPaymentAmount = String(Math.max(0, (due + penalty) - paid));
    }
    const nextPaymentDate = nextInst ? nextInst.due_date : activeLoan ? loanDueDate(activeLoan) : null;
    return { displayName, initials, availableLimit, progress, nextPaymentAmount, nextPaymentDate, penaltyOutstanding };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (loading || !borrower || !derived) return <LoadingState />;

  const blockingLoan = recentLoans.find((l) => (BLOCKING_STATUSES as readonly string[]).includes(l.status)) || null;
  const loanActive = activeLoan !== null;
  const hasBlockingLoan = blockingLoan !== null;
  const focusLoan = activeLoan || blockingLoan;
  const focusLoanIsOverdue = focusLoan?.status === 'OVERDUE';
  const focusLoanIsRepayable = focusLoan?.status === 'ACTIVE' || focusLoan?.status === 'OVERDUE';
  const kycVerified = kycData?.kycStatus === 'VERIFIED';
  const kycNotVerified = !!kycData && kycData.kycStatus !== 'VERIFIED';
  const canApply = !hasBlockingLoan && kycVerified;
  const hasPenalty = derived.penaltyOutstanding > 0;

  function handleApplyClick(product: LoanProduct) {
    setShowMoreModal(false); // close modal
    if (blockingLoan) {
      alert(`You already have an active loan (${blockingLoan.loan_reference}). Please repay it before applying for a new one.`);
      return;
    }
    if (kycNotVerified) {
      alert("Please complete your KYC profile before applying for a loan.");
      router.push('/kyc');
      return;
    }
    const userScore = eligibility?.credit_limit?.credit_score ?? 0;
    const minScore = product.min_credit_score ?? 0;
    if (userScore < minScore) {
      alert(`You are not eligible for this product. Your credit score is ${userScore}, but this product requires a minimum of ${minScore}. Please check other products.`);
      return;
    }
    router.push(`/apply/loan?productId=${product.id}`);
  }

  function toNumber(v: string | number | null | undefined): number {
    if (v === null || v === undefined || v === '') return 0;
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : 0;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F4F6F9] pb-24 text-[#102033]">
      
      {/* NAV */}
      <div className="sticky top-0 z-30 bg-[#0B1F3A]">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <AvatarMenu initials={derived.initials} name={derived.displayName} email={borrower.email} onLogout={onLogout} loggingOut={loggingOut} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Welcome back</p>
            <h1 className="mt-0.5 truncate text-[16px] font-semibold tracking-tight text-white">{derived.displayName}</h1>
          </div>
          <Link href="/notifications" className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/15 active:scale-95">
            <Bell size={18} strokeWidth={2.2} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#D6A83E] ring-2 ring-[#0B1F3A]" />
          </Link>
        </div>
        <div className="h-1 w-full bg-[#D6A83E]" />
      </div>

      <KycBanner data={kycData} hidden={showKycModal} onOpenModal={() => setShowKycModal(true)} />

      {/* HERO CARDS */}
      {loanActive && activeLoan && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B1F3A] via-[#102A4C] to-[#17365D] px-5 py-5 text-white shadow-[0_18px_40px_-22px_rgba(11,31,58,0.65)] sm:px-7 sm:py-7 lg:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">Outstanding balance</p>
                <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-white tabular-nums sm:text-3xl lg:text-4xl">KES {formatKes(activeLoan.outstanding_total)}</p>
                <p className="mt-1.5 text-[11px] font-medium text-white/60">of KES {formatKes(activeLoan.total_due)} total</p>
              </div>
              <ProgressRing value={derived.progress} />
            </div>
            <div className="my-5 h-px bg-white/15" />
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#E4BC57]"><Clock3 size={16} strokeWidth={2.2} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">Amount due</p>
                <p className="mt-0.5 truncate text-[14px] font-bold tracking-tight text-white tabular-nums">KES {formatKes(derived.nextPaymentAmount)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">Due</p>
                <p className="mt-0.5 whitespace-nowrap text-[12px] font-semibold text-white/90">{formatDate(derived.nextPaymentDate)}</p>
              </div>
            </div>
            {focusLoanIsRepayable && activeLoan ? (
              <Link href={`/repay/${activeLoan.id}`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D6A83E] px-4 py-3 text-[13.5px] font-bold tracking-tight text-[#0B1F3A] shadow-sm transition hover:bg-[#E4BC57] active:scale-[0.985]">
                {focusLoanIsOverdue ? 'Pay my overdue loan' : 'Pay now'} <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            ) : (
              <Link href={`/loans/${activeLoan.id}`} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D6A83E] px-4 py-3 text-[13.5px] font-bold tracking-tight text-[#0B1F3A] shadow-sm transition hover:bg-[#E4BC57] active:scale-[0.985]">
                View full loan <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            )}
          </div>
        </div>
      )}

      {!loanActive && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B1F3A] via-[#102A4C] to-[#17365D] px-5 py-5 text-white shadow-[0_18px_40px_-22px_rgba(11,31,58,0.65)] sm:px-7 sm:py-7 lg:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">Available to borrow</p>
                <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-white tabular-nums sm:text-3xl lg:text-4xl">KES {formatKes(derived.availableLimit)}</p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#102A4C]/10 text-[#0B1F3A]"><WalletCards size={19} strokeWidth={2.2} /></div>
            </div>
            <div className="my-5 h-px bg-white/15" />
            <div className="flex items-center gap-2 text-[12px] font-medium text-white/75">
              <CheckCircle2 size={15} strokeWidth={2.2} />
              <span>{kycNotVerified ? 'Complete your KYC to unlock borrowing' : 'Your profile is complete'}</span>
            </div>
            {canApply ? (
              <Link href="/apply/loan" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D6A83E] px-4 py-3 text-[13.5px] font-bold tracking-tight text-[#0B1F3A] shadow-sm transition hover:bg-[#E4BC57] active:scale-[0.985]">
                Apply for a loan <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            ) : (
              <Link href="/kyc" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D6A83E] px-4 py-3 text-[13.5px] font-bold tracking-tight text-[#0B1F3A] shadow-sm transition hover:bg-[#E4BC57] active:scale-[0.985]">
                Complete your KYC <ArrowRight size={15} strokeWidth={2.5} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ============ EVERYDAY SERVICES ============ */}
      <section className="mx-auto mt-8 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-5 text-base font-bold tracking-tight text-[#0B1F3A] sm:text-lg">
          Everyday services
        </h2>
        
        <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-6 lg:gap-6">
          <EverydayServiceTile icon={ArrowLeftRight} label="Transfers" bgClass="bg-[#F4EFFF]" textClass="text-[#8B5CF6]" onClick={() => alert("Transfers coming soon")} />
          <EverydayServiceTile icon={FileText} label="Pay bills" bgClass="bg-[#FFF7E6]" textClass="text-[#D97706]" onClick={() => alert("Pay bills coming soon")} />
          <EverydayServiceTile icon={Smartphone} label="Airtime" bgClass="bg-[#ECFDF3]" textClass="text-[#10B981]" onClick={() => alert("Airtime coming soon")} />
          <EverydayServiceTile icon={PiggyBank} label="Savings" bgClass="bg-[#F4EFFF]" textClass="text-[#8B5CF6]" onClick={() => alert("Savings coming soon")} />
          <EverydayServiceTile icon={TrendingUp} label="Invest" bgClass="bg-[#ECFDF3]" textClass="text-[#10B981]" onClick={() => alert("Invest coming soon")} />
          
          {/* UPDATED MORE ICON TO OPEN MODAL */}
         <EverydayServiceTile icon={Banknote} label="Loans" bgClass="bg-[#ECFDF3]" textClass="text-[#10B981]" href="/loans" />
        </div>
      </section>

      {/* ============ RECENT ACTIVITY ============ */}
      <section className="mx-auto mb-8 mt-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold tracking-tight text-[#0B1F3A] sm:text-lg">Recent Activity</h2>
          {activity.length > 0 && (
            <button onClick={() => router.push('/notifications')} className="text-[12.5px] font-semibold text-[#17365D]">
              View all
            </button>
          )}
        </div>

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {activity.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm lg:col-span-2">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-ink-50 text-ink-400 mb-3">
                <Receipt size={18} strokeWidth={2} />
              </div>
              <p className="text-[13px] font-semibold tracking-tight text-ink-800">No activity yet</p>
              <p className="mt-1 text-[11.5px] font-medium text-ink-400">Your recent transactions will appear here.</p>
            </div>
          ) : (
            activity.slice(0, 5).map((item) => {
              const styled = activityRow(item);
              return (
                <div key={`${item.kind}-${item.loan_id}-${item.at}`} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${styled.iconClass}`}>
                    <styled.Icon size={18} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold tracking-tight text-ink-950">{styled.title}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                      {formatDate(item.at)}{item.receipt ? ` · ${item.receipt}` : ''}
                    </p>
                  </div>
                  {item.amount != null && (
                    <p className={`shrink-0 text-[13px] font-bold tabular-nums tracking-tight ${styled.amountClass}`}>
                      KES {formatKes(item.amount)}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ============ MORE MODAL (BOTTOM SHEET) ============ */}
      {showMoreModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            aria-label="Close"
            onClick={() => setShowMoreModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h2 className="text-[16px] font-bold text-ink-950">More Services</h2>
              <button onClick={() => setShowMoreModal(false)} className="grid h-8 w-8 place-items-center rounded-full bg-ink-100 text-ink-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <LoanProductTile 
                    key={product.id} 
                    product={product} 
                    onApply={handleApplyClick} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <KycModal open={showKycModal} onClose={dismissKycModal} data={kycData} />
    </div>
  );
}