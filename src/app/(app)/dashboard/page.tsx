'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Bell, CheckCircle2, ChevronRight, Clock3, HelpCircle, LogOut,
  Receipt, Settings, User, WalletCards, ShieldAlert, AlertTriangle,
  ArrowLeftRight, FileText, Smartphone, PiggyBank, TrendingUp, LayoutGrid,
  Banknote, Home as HomeIcon, Car, Briefcase, Coins, GraduationCap, X,
  Menu, Search, Home, Shield, Compass
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
    case 'repayment_received': return { title: 'Repayment received', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-green-600' };
    case 'loan_submitted': return { title: 'Loan application', Icon: Receipt, iconClass: 'bg-slate-100 text-slate-500', amountClass: 'text-slate-900' };
    case 'loan_approved': return { title: 'Loan approved', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-slate-900' };
    case 'loan_rejected': return { title: 'Loan declined', Icon: Receipt, iconClass: 'bg-red-50 text-red-600', amountClass: 'text-red-600' };
    case 'loan_disbursed': return { title: 'Loan disbursed', Icon: WalletCards, iconClass: 'bg-blue-50 text-blue-600', amountClass: 'text-slate-900' };
    case 'loan_active': return { title: 'Loan active', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-green-600' };
    case 'loan_overdue': return { title: 'Loan overdue', Icon: AlertTriangle, iconClass: 'bg-red-50 text-red-600', amountClass: 'text-red-600' };
    case 'loan_paid': return { title: 'Loan fully repaid', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-green-600' };
    default: return { title: 'Loan update', Icon: Receipt, iconClass: 'bg-slate-100 text-slate-500', amountClass: 'text-slate-900' };
  }
}

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0077C8" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[13px] font-bold leading-none tracking-tight text-slate-700">{value}%</span>
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
      ? { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-700', titleColor: 'text-red-900', icon: <ShieldAlert size={16} strokeWidth={2.4} />, title: 'Your KYC was rejected', cta: 'Fix now' }
      : kycStatus === 'SUBMITTED'
      ? { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-700', titleColor: 'text-blue-900', icon: <Clock3 size={16} strokeWidth={2.4} />, title: 'Your KYC is being reviewed', cta: null }
      : { bg: 'bg-yellow-50', border: 'border-yellow-200', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-700', titleColor: 'text-yellow-900', icon: <ShieldAlert size={16} strokeWidth={2.4} />, title: 'Complete your KYC to unlock borrowing', cta: 'Complete KYC' };

  const handleClick = () => {
    if (config.cta) window.location.href = '/kyc';
    else onOpenModal();
  };

  return (
    <div className="px-4 pt-4 sm:px-8 sm:pt-6">
      <button type="button" onClick={handleClick} className={`flex w-full items-center gap-3 rounded-xl border ${config.border} ${config.bg} px-4 py-3.5 text-left transition active:scale-[0.99]`}>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${config.iconBg} ${config.iconColor}`}>{config.icon}</div>
        <div className="min-w-0 flex-1">
          <p className={`mt-0.5 truncate text-[13.5px] font-bold tracking-tight ${config.titleColor}`}>{config.title}</p>
        </div>
        {kycStatus !== 'SUBMITTED' && <ChevronRight size={18} className={config.iconColor} />}
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
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative flex h-10 w-10 place-items-center rounded-full bg-[#FF8A65] text-sm font-bold text-white ring-2 ring-white">
        {initials}
      </button>
      {open && (
        <>
          <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-[13px] font-bold tracking-tight text-slate-900">{name}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{email}</p>
            </div>
            <button type="button" onClick={() => go('/profile')} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50">
              <User size={16} strokeWidth={2.2} className="shrink-0 text-slate-500" />
              <span className="text-[12.5px] font-semibold text-slate-800">My profile</span>
            </button>
            <div className="border-t border-slate-100" />
            <button type="button" onClick={onLogout} disabled={loggingOut} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-red-50 disabled:opacity-60">
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
    /* Added 'fixed inset-0 z-[9999]' to cover the purple bottom nav during initial load */
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F6F8]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0077C8] border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard...</p>
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    
    // Credit Score Logic
    const rawScore = eligibility?.credit_limit?.credit_score || 0;
    let creditStatus = 'Poor';
    let scoreColor = 'bg-red-50 text-red-600';
    if (rawScore >= 700) { creditStatus = 'Excellent'; scoreColor = 'bg-green-50 text-green-700'; }
    else if (rawScore >= 500) { creditStatus = 'Good'; scoreColor = 'bg-blue-50 text-blue-700'; }
    else if (rawScore >= 300) { creditStatus = 'Fair'; scoreColor = 'bg-yellow-50 text-yellow-700'; }

    return { displayName, initials, availableLimit, progress, nextPaymentAmount, nextPaymentDate, penaltyOutstanding, rawScore, creditStatus, scoreColor };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (loading || !borrower || !derived) return <LoadingState />;

  const loanActive = activeLoan !== null;

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F6F8] font-sans text-slate-800">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 flex-col bg-[#0077C8] text-white md:flex shrink-0">
        <div className="flex h-24 items-center px-8">
          <Link href="/dashboard" className="leading-tight">
            <h1 className="text-3xl font-bold tracking-tight text-white">Imara Credit</h1>
            <p className="text-[10px] font-medium text-white/80">Your goals. Our support</p>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <Link href="/dashboard" className="flex items-center gap-4 rounded-lg bg-white/15 px-4 py-3.5 text-sm font-medium text-white transition-colors">
            <Home size={20} className="text-white" />
            Dashboard
          </Link>
          <Link href="/products" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Shield size={20} className="text-white/70" />
            Products
          </Link>
          <Link href="/discover" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Compass size={20} className="text-white/70" />
            Discover
          </Link>
          <Link href="/activity" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <FileText size={20} className="text-white/70" />
            Activity
          </Link>
          <Link href="/help" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <HelpCircle size={20} className="text-white/70" />
            Help
          </Link>
        </nav>

        <div className="p-6">
          <button onClick={onLogout} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8] shadow-sm transition hover:bg-slate-50">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* TOP NAVBAR */}
        <header className="flex h-[72px] shrink-0 items-center justify-between bg-white px-4 sm:px-8 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu size={24} />
            </button>
            <div className="hidden md:flex w-96 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="Search anything..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 md:hidden">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100">
              <Bell size={18} strokeWidth={2.2} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <AvatarMenu initials={derived.initials} name={derived.displayName} email={borrower.email} onLogout={onLogout} loggingOut={loggingOut} />
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-2 sm:px-8 sm:pb-8 sm:pt-4 md:pb-8">
          
          <KycBanner data={kycData} hidden={showKycModal} onOpenModal={() => setShowKycModal(true)} />

          {/* WELCOME HEADER */}
          <div className="mb-6 mt-0">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Hi, {derived.displayName}</h2>
            <p className="mt-1 text-sm text-slate-500">Welcome back to your dashboard.</p>
          </div>

          {/* ROW 1: THE TWO CARDS LAYOUT */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* CARD 1: ACTIVE LOAN */}
            <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</p>
                  <h3 className="mt-1 text-3xl font-extrabold text-slate-900">
                    KES {formatKes(activeLoan ? activeLoan.outstanding_total : derived.availableLimit)}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {loanActive ? `of KES ${formatKes(activeLoan.total_due)} total` : 'Available to borrow'}
                  </p>
                </div>
                
                {/* Progress Ring */}
                <ProgressRing value={loanActive ? derived.progress : 100} size={60} stroke={5} />
              </div>

              <div className="my-5 h-px w-full bg-slate-100" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Payment</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    KES {loanActive ? formatKes(derived.nextPaymentAmount) : '0'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Due Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Clock3 size={14} className="text-slate-400" /> {loanActive ? formatDate(derived.nextPaymentDate) : '—'}
                  </p>
                </div>
              </div>

              <Link href={loanActive ? `/repay/${activeLoan.id}` : '/apply/loan'} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0077C8] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0060a3]">
                {loanActive ? 'Repay Now' : 'Apply for a Loan'} <ArrowRight size={16} />
              </Link>
            </div>

            {/* CARD 2: CREDIT PROFILE */}
            <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Credit Profile</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${derived.scoreColor}`}>
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">{derived.rawScore}</h3>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${derived.scoreColor}`}>
                      {derived.creditStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="my-5 h-px w-full bg-slate-100" />

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Loan Limit</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">KES {formatKes(derived.availableLimit)}</p>
                <p className="mt-1 text-xs text-slate-500">Based on your current credit score.</p>
              </div>

              <Link href="/apply/loan" className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#0077C8] bg-white px-4 py-3 text-sm font-bold text-[#0077C8] transition hover:bg-blue-50">
                Apply for a Loan
              </Link>
            </div>
          </div>

          {/* ROW 2: QUICK ACTIONS & MY PRODUCTS */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
             
             <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                {[
                  { icon: ArrowLeftRight, label: 'Transfers' },
                  { icon: FileText, label: 'Pay bills' },
                  { icon: Smartphone, label: 'Airtime' },
                  { icon: PiggyBank, label: 'Savings' },
                  { icon: TrendingUp, label: 'Invest' },
                  { icon: Banknote, label: 'Loans' },
                ].map((action) => (
                  <button key={action.label} className="flex flex-col items-center gap-2 group">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0077C8] text-white shadow-sm transition-transform group-hover:scale-105 group-active:scale-95">
                      <action.icon size={20} />
                    </div>
                    <span className="text-center text-[11px] font-semibold text-slate-600">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* My Products */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50 flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">My Products</h3>
                <Link href="/loans" className="text-sm font-semibold text-[#0077C8] hover:underline">View All</Link>
              </div>
              
              <div className="flex-1 space-y-3">
                {recentLoans.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                    <p className="text-sm font-medium text-slate-500">No loans found</p>
                    <Link href="/apply/loan" className="mt-2 text-xs font-bold text-[#0077C8] hover:underline">Apply for your first loan</Link>
                  </div>
                ) : (
                  recentLoans.slice(0, 3).map((loan) => {
                    let badgeColor = 'bg-slate-100 text-slate-600';
                    if (loan.status === 'ACTIVE') badgeColor = 'bg-blue-50 text-blue-700';
                    if (loan.status === 'OVERDUE') badgeColor = 'bg-red-50 text-red-700';
                    if (loan.status === 'PENDING' || loan.status === 'APPROVED' || loan.status === 'DISBURSED') badgeColor = 'bg-yellow-50 text-yellow-700';
                    if (loan.status === 'PAID') badgeColor = 'bg-green-50 text-green-700';

                    return (
                      <div key={loan.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-4 transition hover:border-slate-300">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            loan.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 
                            loan.status === 'OVERDUE' ? 'bg-red-50 text-red-600' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            <Banknote size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {loan.loan_reference || `Loan #${loan.id}`}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                              KES {formatKes(loan.principal_amount)} principal
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                            {loan.status}
                          </span>
                          <Link href={`/loans/${loan.id}`} className="text-xs font-semibold text-[#0077C8] hover:underline">
                            View
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* ROW 3: EXPLORE PRODUCTS */}
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Explore Imara Products</h3>
              <button className="text-sm font-semibold text-[#0077C8] hover:underline">View All</button>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <p className="text-sm text-slate-500">Explore our loan products tailored to your needs.</p>
            </div>
          </div>

        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white px-2 py-3 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[#0077C8]">
          <Home size={22} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/apply" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Compass size={22} />
          <span className="text-[10px] font-medium">Apply</span>
        </Link>
        <Link href="/loans" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <FileText size={22} />
          <span className="text-[10px] font-medium">Loans</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <HelpCircle size={22} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[#0077C8] text-white shadow-2xl transition-transform">
            <div className="flex h-20 items-center justify-between px-6">
              <Link href="/dashboard" className="leading-tight">
                <h1 className="text-2xl font-bold tracking-tight text-white">Imara</h1>
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-4 mt-4">
              <Link href="/dashboard" className="flex items-center gap-4 rounded-lg bg-white/15 px-4 py-3.5 text-sm font-medium text-white">
                <Home size={20} /> Dashboard
              </Link>
              <Link href="/products" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80">
                <Shield size={20} /> Products
              </Link>
              <Link href="/discover" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80">
                <Compass size={20} /> Discover
              </Link>
              <Link href="/activity" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80">
                <FileText size={20} /> Activity
              </Link>
            </nav>
            <div className="p-6">
              <button onClick={onLogout} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8]">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <KycModal open={showKycModal} onClose={dismissKycModal} data={kycData} />
    </div>
  );
}