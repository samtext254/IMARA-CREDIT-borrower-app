'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Bell, CheckCircle2, ChevronDown, ChevronRight, Clock3, HelpCircle, LogOut,
  Receipt, User, WalletCards, ShieldAlert, AlertTriangle, ArrowLeftRight, FileText, 
  Smartphone, PiggyBank, TrendingUp, Banknote, Home, Shield, Compass, Calendar, 
  Settings, Send, Lock, RefreshCw, Briefcase, Leaf, Search, MoreHorizontal, X, Menu
} from 'lucide-react';
import { imara } from '@/lib/api';
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
function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/*  Reusable Components                                                */
/* ------------------------------------------------------------------ */
function LoadingState() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAFC]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a5cbe] border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard...</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Home Page                                                     */
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
  const [loggingOut, setLoggingOut] = useState(false);
  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, eligRes, activeLoansRes, recentLoansRes, kycRes, activityRes] = await Promise.allSettled([
          imara.me(), loansApi.getEligibility(), loansApi.getLoans({ limit: 5 }), loansApi.getLoans({ limit: 20 }), getKycStatus(), loansApi.getActivity({ limit: 10 }),
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    const loanOutstanding = activeLoan ? toNumber(activeLoan.outstanding_total) : 0;
    const totalDue = activeLoan ? toNumber(activeLoan.total_due) : 0;
    
    let nextPaymentAmount = String(loanOutstanding);
    if (nextInst) {
      const due = Number(nextInst.total_due || 0);
      const paid = Number(nextInst.total_paid || 0);
      const penalty = Number(nextInst.penalty_due || 0);
      nextPaymentAmount = String(Math.max(0, (due + penalty) - paid));
    }
    
    const nextPaymentDate = nextInst ? nextInst.due_date : activeLoan ? loanDueDate(activeLoan) : null;
    
    const rawScore = eligibility?.credit_limit?.credit_score || 50;
    let creditStatus = 'Poor';
    let scoreColor = 'text-rose-500';
    let strokeColor = '#F43F5E';
    if (rawScore >= 700) { creditStatus = 'Excellent'; scoreColor = 'text-emerald-500'; strokeColor = '#10B981'; }
    else if (rawScore >= 500) { creditStatus = 'Good'; scoreColor = 'text-blue-500'; strokeColor = '#3B82F6'; }
    else if (rawScore >= 300) { creditStatus = 'Fair'; scoreColor = 'text-amber-500'; strokeColor = '#F59E0B'; }

    return { displayName, initials, availableLimit, progress, nextPaymentAmount, nextPaymentDate, rawScore, creditStatus, scoreColor, strokeColor, loanOutstanding, totalDue };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (loading || !borrower || !derived) return <LoadingState />;

  const loanActive = activeLoan !== null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] font-sans text-slate-800">
      
      {/* ==================== SIDEBAR ==================== */}
      <aside className="hidden w-[260px] flex-col bg-[#0f294d] text-white md:flex shrink-0">
        {/* Logo */}
        <div className="flex h-20 items-center px-6 mt-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22c55e]">
              <Leaf size={20} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight text-white leading-tight">Imara Credit</h1>
              <p className="text-[10px] text-slate-300">Loans • Payments • Financial Growth</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 mt-4 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-[#1a3c6e] px-4 py-3 text-sm font-medium text-white transition-colors">
            <Home size={18} className="text-white" />
            Home
          </Link>
          <Link href="/loans" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <WalletCards size={18} className="text-slate-400" />
            Loans
          </Link>
          <Link href="/payments" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <Receipt size={18} className="text-slate-400" />
            Payments
          </Link>
          <Link href="/m-pesa" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <Smartphone size={18} className="text-slate-400" />
            M-PESA Services
          </Link>
          <Link href="/savings" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <PiggyBank size={18} className="text-slate-400" />
            Savings
          </Link>
          <Link href="/credit-score" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <Shield size={18} className="text-slate-400" />
            Credit Score
          </Link>
          <Link href="/transactions" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <ArrowLeftRight size={18} className="text-slate-400" />
            Transactions
          </Link>
          <Link href="/products" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <Briefcase size={18} className="text-slate-400" />
            Products
          </Link>
          <Link href="/support" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
            <HelpCircle size={18} className="text-slate-400" />
            Support
          </Link>
        </nav>

        {/* Footer Promo */}
        <div className="p-6 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#22c55e]/20 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22c55e] mb-4">
              <Leaf size={20} className="text-white" fill="currentColor" />
            </div>
            <p className="text-[15px] font-bold text-white mb-1">Your financial<br/>journey, made easier.</p>
            <p className="text-[11px] text-slate-400">Borrow • Save • Pay • Grow</p>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="flex h-20 shrink-0 items-center justify-between bg-white px-6 sm:px-8 border-b border-slate-100">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu size={24} />
            </button>
            <div className="hidden md:flex w-full max-w-lg items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="Search services, transactions, loans..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-100 text-slate-600 transition hover:bg-slate-50">
              <Bell size={20} strokeWidth={2} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div ref={profileRef} className="relative flex items-center gap-3 cursor-pointer" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316] text-sm font-bold text-white">
                {derived.initials}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-bold text-slate-900">{derived.displayName}</p>
                <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <ChevronDown size={12} /> View Profile
                </p>
              </div>
              
              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 top-full z-50 mt-4 w-56 origin-top-right rounded-xl border border-slate-100 bg-white shadow-lg p-2">
                  <button type="button" onClick={() => router.push('/profile')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50">
                    <User size={16} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">My profile</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button type="button" onClick={onLogout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-red-50 disabled:opacity-60">
                    <LogOut size={16} className="text-red-600" />
                    <span className="text-sm font-bold text-red-600">{loggingOut ? 'Logging out…' : 'Log out'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            
            {/* ROW 1: HERO & LOAN SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* HERO BANNER (Spans 2 cols) */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#0a5cbe] p-8 text-white flex flex-col justify-center min-h-[200px]">
                {/* Background decoration */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none">
                   <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
                   <div className="absolute right-20 bottom-0 h-40 w-40 rounded-full bg-blue-300/30 blur-2xl" />
                </div>
                
                <div className="relative z-10 max-w-sm">
                  <p className="text-blue-100 text-sm font-medium mb-1">Good morning,</p>
                  <h2 className="text-3xl font-bold mb-3">{derived.displayName}</h2>
                  <p className="text-blue-100/90 text-sm mb-6">Your financial partner, always.</p>
                  
                  <div className="flex items-center gap-6 text-sm font-medium">
                    <p>Send money,<br/>pay bills, buy airtime<br/>and more—all in one place.</p>
                  </div>
                </div>

                {/* Fake Phone Graphic */}
                <div className="hidden sm:flex absolute right-8 top-1/2 -translate-y-1/2 h-48 w-32 bg-slate-800 rounded-3xl border-4 border-slate-700 rotate-12 shadow-2xl overflow-hidden flex-col z-10">
                   <div className="w-full h-full bg-gradient-to-br from-[#22c55e]/20 to-transparent flex items-center justify-center">
                     <Smartphone size={40} className="text-white/50" />
                   </div>
                </div>
              </div>

              {/* LOAN SUMMARY CARD */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900">Loan Summary</h3>
                  <Link href="/loans" className="text-[12px] font-semibold text-[#0a5cbe] hover:underline flex items-center gap-1">
                    View details <ArrowRight size={12} />
                  </Link>
                </div>
                
                {/* Progress Circle */}
                <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-5">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#0a5cbe" strokeWidth="4" strokeLinecap="round" strokeDasharray={150} strokeDashoffset={150 - (150 * (loanActive ? derived.progress : 100)) / 100} />
                    </svg>
                    <span className="absolute text-[13px] font-bold text-slate-700">{loanActive ? derived.progress : 100}%</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">Current Loan</p>
                    <p className="text-lg font-bold text-slate-900">KES {formatKes(loanActive ? derived.loanOutstanding : 0)}</p>
                    <p className="text-[10px] text-slate-400">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar size={14} />
                      <span className="text-[12px] font-medium">Next Payment</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-slate-900">KES {loanActive ? formatKes(derived.nextPaymentAmount) : '0'}</p>
                      <p className="text-[10px] text-slate-400">{loanActive ? formatDate(derived.nextPaymentDate) : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText size={14} />
                      <span className="text-[12px] font-medium">Loan Status</span>
                    </div>
                    <div>
                      {loanActive ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Active</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">None</span>
                      )}
                    </div>
                  </div>
                </div>

                <Link href={loanActive ? `/repay/${activeLoan.id}` : '/apply/loan'} className="flex w-full items-center justify-center rounded-lg bg-[#0a5cbe] py-2.5 text-sm font-bold text-white transition hover:bg-blue-800">
                  Make a Repayment
                </Link>
              </div>
            </div>

            {/* ROW 2: SUMMARY CARDS (4 cols) */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Account Balance */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#0a5cbe]">
                    <Banknote size={20} />
                  </div>
                  <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-400">i</div>
                </div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1">Account Balance</p>
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">KES 12,450.00</h3>
                <p className="text-[11px] text-slate-400 mb-4">Available funds</p>
                <Link href="/wallet" className="text-[11px] font-bold text-[#0a5cbe] flex items-center gap-1 hover:underline">
                  View details <ArrowRight size={12} />
                </Link>
              </div>

              {/* Savings */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <PiggyBank size={20} />
                  </div>
                  <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-400">i</div>
                </div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1">Savings</p>
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">KES 3,200.00</h3>
                <p className="text-[11px] text-slate-400 mb-4">Your savings balance</p>
                <Link href="/savings" className="text-[11px] font-bold text-[#0a5cbe] flex items-center gap-1 hover:underline">
                  View savings <ArrowRight size={12} />
                </Link>
              </div>

              {/* Loan Balance */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <WalletCards size={20} />
                  </div>
                  <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-400">i</div>
                </div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1">Loan Balance</p>
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">KES {formatKes(loanActive ? derived.loanOutstanding : 0)}</h3>
                <p className="text-[11px] text-slate-400 mb-4">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>
                <Link href="/loans" className="text-[11px] font-bold text-[#0a5cbe] flex items-center gap-1 hover:underline">
                  View loan <ArrowRight size={12} />
                </Link>
              </div>

              {/* M-PESA Balance */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Smartphone size={20} />
                  </div>
                  <div className="h-4 w-4 rounded-full border border-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-400">i</div>
                </div>
                <p className="text-[12px] font-semibold text-slate-500 mb-1">M-PESA Balance</p>
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">KES 2,480.00</h3>
                <p className="text-[11px] text-slate-400 mb-4">Your M-PESA wallet</p>
                <Link href="/m-pesa" className="text-[11px] font-bold text-[#0a5cbe] flex items-center gap-1 hover:underline">
                  Send money <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {/* ROW 3: QUICK ACTIONS & RIGHT COLUMN */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN (Spans 2) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Quick Actions */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-bold text-slate-900">Quick Actions</h3>
                    <Link href="/actions" className="text-[12px] font-semibold text-[#0a5cbe] hover:underline">View all</Link>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { icon: Send, label: 'Send Money', color: 'bg-emerald-500' },
                      { icon: Smartphone, label: 'Buy Airtime', color: 'bg-blue-500' },
                      { icon: Receipt, label: 'Pay Bills', color: 'bg-cyan-500' },
                      { icon: ArrowLeftRight, label: 'Transfers', color: 'bg-purple-500' },
                      { icon: PiggyBank, label: 'Save Money', color: 'bg-emerald-500' },
                      { icon: Banknote, label: 'Apply for Loan', color: 'bg-indigo-600' },
                    ].map((action, i) => (
                      <button key={i} className="flex flex-col items-center gap-2 group">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm transition-transform group-hover:scale-105 ${action.color}`}>
                          <action.icon size={22} />
                        </div>
                        <span className="text-center text-[11px] font-semibold text-slate-600">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
                    <Link href="/transactions" className="text-[12px] font-semibold text-[#0a5cbe] hover:underline">View all</Link>
                  </div>
                  <div className="space-y-1">
                    {[
                      { title: 'M-PESA Deposit', date: '12 Oct 2026 • 10:24 AM', amount: '+ KES 1,000', type: 'in', icon: ArrowLeftRight, color: 'text-emerald-600 bg-emerald-50' },
                      { title: 'Loan Repayment', date: '10 Oct 2026 • 04:12 PM', amount: '- KES 500', type: 'out', icon: Banknote, color: 'text-blue-600 bg-blue-50' },
                      { title: 'Airtime Purchase', date: '08 Oct 2026 • 09:22 AM', amount: '- KES 200', type: 'out', icon: Smartphone, color: 'text-orange-600 bg-orange-50' },
                      { title: 'KPLC Bill Payment', date: '05 Oct 2026 • 11:05 AM', amount: '- KES 1,250', type: 'out', icon: Receipt, color: 'text-cyan-600 bg-cyan-50' },
                    ].map((tx, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tx.color}`}>
                            <tx.icon size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{tx.title}</p>
                            <p className="text-[11px] text-slate-400">{tx.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${tx.type === 'in' ? 'text-emerald-600' : 'text-slate-900'}`}>{tx.amount}</p>
                          <p className="text-[10px] font-medium text-emerald-500">Success</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (Spans 1) */}
              <div className="space-y-6">
                
                {/* Credit Score */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900">Credit Score</h3>
                    <Link href="/credit-score" className="text-[12px] font-semibold text-[#0a5cbe] hover:underline flex items-center gap-1">
                      View details <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    {/* Semi-circle gauge */}
                    <div className="relative flex flex-col items-center">
                      <svg width="100" height="60" viewBox="0 0 100 60">
                        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#F1F5F9" strokeWidth="8" strokeLinecap="round" />
                        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={derived.strokeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray="125" strokeDashoffset={125 - (125 * Math.min(100, Math.max(0, derived.rawScore))) / 100} />
                      </svg>
                      <div className="absolute bottom-0 flex flex-col items-center">
                        <span className="text-xl font-extrabold text-slate-900">{derived.rawScore}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${derived.scoreColor}`}>{derived.creditStatus}</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 flex-1 ml-4 border border-slate-100">
                      <p className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                        <Shield size={12} className="text-[#0a5cbe]" /> Credit Tips
                      </p>
                      Keep your repayments on time to improve your score.
                    </div>
                  </div>
                </div>

                {/* Need a bigger loan? Promo */}
                <div className="rounded-xl bg-[#0f294d] p-6 shadow-sm text-white relative overflow-hidden flex flex-col items-start">
                  <h3 className="text-[17px] font-bold mb-1 z-10">Need a bigger loan?</h3>
                  <p className="text-[12px] text-slate-300 mb-4 z-10 max-w-[60%]">Get up to KES 50,000 with flexible repayment terms.</p>
                  <Link href="/apply/loan" className="relative z-10 flex items-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#16a34a]">
                    Apply Now <ArrowRight size={14} />
                  </Link>
                  
                  {/* Graphic */}
                  <div className="absolute right-[-10px] bottom-[-20px] z-0">
                    <div className="relative">
                       <div className="h-24 w-16 bg-white rounded-md shadow-lg rotate-12 flex flex-col p-2 items-start gap-1">
                         <div className="h-1 w-8 bg-slate-200 rounded" />
                         <div className="h-1 w-10 bg-slate-200 rounded" />
                         <div className="h-1 w-6 bg-slate-200 rounded" />
                       </div>
                       <div className="absolute -bottom-2 -right-2 bg-[#22c55e] h-8 w-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                         <CheckCircle2 size={16} className="text-white" />
                       </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </main>
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[260px] flex-col bg-[#0f294d] text-white shadow-2xl transition-transform">
             <div className="flex h-20 items-center justify-between px-6 mt-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22c55e]">
                  <Leaf size={20} className="text-white" fill="currentColor" />
                </div>
                <div>
                  <h1 className="text-[17px] font-bold tracking-tight text-white leading-tight">Imara</h1>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 mt-4 overflow-y-auto">
              <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-[#1a3c6e] px-4 py-3 text-sm font-medium text-white">
                <Home size={18} /> Home
              </Link>
              <Link href="/loans" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300">
                <WalletCards size={18} /> Loans
              </Link>
              <Link href="/payments" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300">
                <Receipt size={18} /> Payments
              </Link>
              <Link href="/savings" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300">
                <PiggyBank size={18} /> Savings
              </Link>
              <Link href="/terms" className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300">
                <FileText size={18} /> Terms & Conditions
              </Link>
            </nav>
            <div className="p-6">
              <button onClick={onLogout} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0f294d]">
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