'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowRight, Bell, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, HelpCircle,
  LogOut, Receipt, User, WalletCards, ArrowLeftRight, FileText, Smartphone, PiggyBank, Home,
  Shield, Calendar, Send, Briefcase, Leaf, Search, X, Landmark, MoreHorizontal, Info,
  ClipboardList, AlertTriangle, Plus, Clock, Lightbulb, Lock, Headphones, ArrowDownLeft,
  Sparkles, BadgeCheck,
} from 'lucide-react';
import { imara } from '@/lib/api';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { ActivityItem, Eligibility, Loan, LoanScheduleEntry } from '@/lib/loans';
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
function formatKes2(amount: any): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
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
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function activityRow(item: ActivityItem): {
  title: string; sub: string; Icon: any; iconClass: string; amountClass: string; sign: string; status: string; statusClass: string;
} {
  const ok = 'bg-emerald-50 text-emerald-600';
  const done = 'bg-sky-50 text-sky-600';
  switch (item.kind) {
    case 'repayment_received': return { title: 'Repayment received', sub: 'Loan repayment', Icon: ArrowDownLeft, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '+ ', status: 'Success', statusClass: ok };
    case 'loan_submitted': return { title: 'Loan application', sub: 'Loan', Icon: Receipt, iconClass: 'bg-slate-500', amountClass: 'text-slate-900', sign: '', status: 'Submitted', statusClass: done };
    case 'loan_approved': return { title: 'Loan approved', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-slate-900', sign: '', status: 'Approved', statusClass: ok };
    case 'loan_rejected': return { title: 'Loan declined', sub: 'Loan', Icon: Receipt, iconClass: 'bg-rose-500', amountClass: 'text-rose-600', sign: '', status: 'Declined', statusClass: 'bg-rose-50 text-rose-600' };
    case 'loan_disbursed': return { title: 'Loan disbursed', sub: 'Loan', Icon: WalletCards, iconClass: 'bg-blue-600', amountClass: 'text-slate-900', sign: '', status: 'Completed', statusClass: done };
    case 'loan_active': return { title: 'Loan active', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '', status: 'Success', statusClass: ok };
    case 'loan_overdue': return { title: 'Loan overdue', sub: 'Loan', Icon: AlertTriangle, iconClass: 'bg-rose-500', amountClass: 'text-rose-600', sign: '', status: 'Overdue', statusClass: 'bg-rose-50 text-rose-600' };
    case 'loan_paid': return { title: 'Loan fully repaid', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '', status: 'Success', statusClass: ok };
    default: return { title: 'Loan update', sub: 'Loan', Icon: Receipt, iconClass: 'bg-slate-500', amountClass: 'text-slate-900', sign: '', status: 'Completed', statusClass: done };
  }
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
const NAV = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/loans', label: 'Loans', icon: WalletCards },
  { href: '/payments', label: 'Payments', icon: Receipt },
  { href: '/m-pesa', label: 'M-PESA Services', icon: Smartphone },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
  { href: '/credit-score', label: 'Credit Score', icon: Shield },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/products', label: 'Products', icon: Briefcase },
  { href: '/support', label: 'Support', icon: HelpCircle },
];

const BOTTOM_NAV = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/loans', label: 'Loans', icon: WalletCards },
  { href: '/payments', label: 'Payments', icon: Receipt },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
];

const QUICK_ACTIONS = [
  { icon: Send, label: 'Send Money', href: '/m-pesa', color: 'bg-emerald-500' },
  { icon: Smartphone, label: 'Buy Airtime', href: '/m-pesa', color: 'bg-blue-500' },
  { icon: FileText, label: 'Pay Bills', href: '/payments', color: 'bg-sky-500' },
  { icon: ArrowLeftRight, label: 'Transfers', href: '/transactions', color: 'bg-violet-500' },
  { icon: PiggyBank, label: 'Save Money', href: '/savings', color: 'bg-emerald-500' },
  { icon: ClipboardList, label: 'Apply for Loan', href: '/apply/loan', color: 'bg-[#0f2f66]' },
];

const CREDIT_TIPS = ['Pay your loans on time', 'Keep your wallet active', 'Reduce credit utilization'];

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(15,41,77,0.05)]';

/* ------------------------------------------------------------------ */
/*  Reusable components                                                */
/* ------------------------------------------------------------------ */
function LoadingState() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F7FB]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a5cbe] border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard...</p>
    </div>
  );
}

function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        <Leaf size={32} className="text-emerald-500" fill="currentColor" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className={`text-[22px] tracking-tight ${dark ? 'text-white' : 'text-[#0f2f66]'}`}>
            <span className="font-semibold">Imara</span> <span className="font-medium">Credit</span>
          </p>
          <p className={`text-[8.5px] font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
            Loans • Payments • Financial Growth
          </p>
        </div>
      )}
    </div>
  );
}

function NavLinks({ pathname, onNavigate, collapsed = false }: { pathname: string; onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={label}
            className={`flex items-center rounded-xl text-[15px] font-medium transition-colors ${
              collapsed ? 'justify-center px-0 py-3.5' : 'gap-4 px-5 py-3.5'
            } ${active ? 'bg-gradient-to-r from-[#1565d8] to-[#0f4fb0] text-white shadow-lg shadow-blue-900/30' : 'text-slate-200 hover:bg-white/5 hover:text-white'}`}
          >
            <Icon size={21} strokeWidth={1.7} className={active ? 'text-white' : 'text-slate-200'} />
            {!collapsed && label}
          </Link>
        );
      })}
    </>
  );
}

function CardIcon({ icon: Icon, tile }: { icon: any; tile: string }) {
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${tile}`}>
      <Icon size={22} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Home Page                                                     */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';
  const [borrower, setBorrower] = useState<BorrowerProfile | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<LoanScheduleEntry[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Desktop sidebar always starts collapsed on every login (never persisted).
  const [collapsed, setCollapsed] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, eligRes, activeLoansRes, kycRes, activityRes] = await Promise.allSettled([
          imara.me(), loansApi.getEligibility(), loansApi.getLoans({ limit: 5 }), getKycStatus(), loansApi.getActivity({ limit: 10 }),
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
      const t = event.target as Node;
      const inside = (profileRef.current && profileRef.current.contains(t)) || (profileMobileRef.current && profileMobileRef.current.contains(t));
      if (!inside) setIsProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    const progress = activeLoan ? computeProgress(activeLoan) : 0;
    const nextInst = activeSchedule.length > 0 ? nextInstallment(activeSchedule) : null;
    const loanOutstanding = activeLoan ? toNumber(activeLoan.outstanding_total) : 0;
    const totalDue = activeLoan ? toNumber(activeLoan.total_due) : 0;

    let nextPaymentAmount = String(loanOutstanding);
    let installment = totalDue;
    if (nextInst) {
      const due = Number(nextInst.total_due || 0);
      const paid = Number(nextInst.total_paid || 0);
      const penalty = Number(nextInst.penalty_due || 0);
      nextPaymentAmount = String(Math.max(0, (due + penalty) - paid));
      installment = due;
    }
    const nextPaymentDate = nextInst ? nextInst.due_date : activeLoan ? loanDueDate(activeLoan) : null;
    const dueIn = daysUntil(nextPaymentDate);

    const rawScore = eligibility?.credit_limit?.credit_score || 50;
    let creditStatus = 'Poor';
    let pill = 'bg-rose-50 text-rose-500';
    if (rawScore >= 700) { creditStatus = 'Excellent'; pill = 'bg-emerald-50 text-emerald-600'; }
    else if (rawScore >= 500) { creditStatus = 'Good'; pill = 'bg-blue-50 text-blue-600'; }
    else if (rawScore >= 300) { creditStatus = 'Fair'; pill = 'bg-amber-50 text-amber-600'; }

    const scoreMax = rawScore > 100 ? 850 : 100;
    const scorePct = Math.min(100, Math.max(0, (rawScore / scoreMax) * 100));

    return { displayName, initials, progress, nextPaymentAmount, nextPaymentDate, dueIn, installment, rawScore, creditStatus, pill, scorePct, loanOutstanding, totalDue };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (loading || !borrower || !derived) return <LoadingState />;

  const loanActive = activeLoan !== null;
  const repayHref = loanActive ? `/repay/${activeLoan.id}` : '/loans';
  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;
  const ringPct = loanActive ? derived.progress : 0;
  const gaugeLen = Math.PI * 40;
  const dueLabel = derived.dueIn === null ? '—' : derived.dueIn < 0 ? `${Math.abs(derived.dueIn)} days ago` : derived.dueIn === 0 ? 'Today' : `${derived.dueIn} day${derived.dueIn === 1 ? '' : 's'}`;

  /* ---------- Profile dropdown ---------- */
  const profileMenu = isProfileOpen && (
    <div className="absolute right-0 top-full z-50 mt-3 w-56 origin-top-right rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
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
  );

  return (
    <div className="fixed inset-0 z-[100] flex overflow-hidden bg-[#F4F7FB] font-sans text-slate-800">

      {/* ==================== DESKTOP SIDEBAR (collapsed by default) ==================== */}
      <aside
        className={`relative hidden shrink-0 flex-col bg-gradient-to-b from-[#0b2a57] to-[#081d3f] text-white transition-[width] duration-300 lg:flex ${
          collapsed ? 'w-[84px]' : 'w-[268px]'
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-8 z-20 grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-[#0f2f66] shadow-md transition hover:bg-slate-50"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`pb-2 pt-7 ${collapsed ? 'px-2' : 'px-5'}`}>
          <Logo dark compact={collapsed} />
        </div>

        <nav className={`mt-6 flex-1 space-y-1.5 overflow-y-auto ${collapsed ? 'px-3' : 'px-4'}`}>
          <NavLinks pathname={pathname} collapsed={collapsed} />
        </nav>

        {!collapsed && (
          <div className="relative m-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <svg className="pointer-events-none absolute -bottom-2 -right-2 h-32 w-56" viewBox="0 0 200 130" fill="none">
              <path d="M0 130 C 60 110, 120 70, 200 0 L200 130 Z" fill="url(#sw1)" opacity="0.9" />
              <path d="M20 130 C 80 120, 140 90, 200 40 L200 130 Z" fill="#0a5cbe" opacity="0.6" />
              <defs>
                <linearGradient id="sw1" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor="#16a34a" />
                  <stop offset="1" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
            <Leaf size={22} className="relative mb-3 text-emerald-400" fill="currentColor" />
            <p className="relative text-[17px] font-semibold leading-snug">Your financial<br />journey, made easier.</p>
            <p className="relative mt-2 text-[10.5px] text-slate-200">Borrow • Save • Pay • Grow</p>
            <div className="h-14" />
          </div>
        )}

        <div className={`flex items-center gap-2 pb-5 text-[11px] text-slate-300 ${collapsed ? 'justify-center' : 'px-6'}`} title="Secure & Trusted">
          <Lock size={13} />
          {!collapsed && <span>Secure &amp; Trusted</span>}
        </div>
      </aside>

      {/* ==================== MAIN COLUMN ==================== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ---------- DESKTOP HEADER ---------- */}
        <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8 lg:flex">
          <div className="flex w-full max-w-[540px] items-center gap-3 rounded-full bg-[#EEF3FA] px-5 py-3">
            <Search size={17} className="text-slate-500" />
            <input type="text" placeholder="Search services, transactions, loans..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-[#0f2f66] transition hover:bg-slate-50" aria-label="Notifications">
              <Bell size={21} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div ref={profileRef} className="relative flex cursor-pointer items-center gap-3" onClick={() => setIsProfileOpen((v) => !v)}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0a5cbe] text-sm font-bold text-white">{derived.initials}</div>
              <p className="text-[13px] font-bold uppercase text-slate-900">{derived.displayName}</p>
              <ChevronDown size={15} className="text-slate-500" />
              {profileMenu}
            </div>
          </div>
        </header>

        {/* ---------- MOBILE HEADER ---------- */}
        <header className="flex shrink-0 items-center justify-between bg-white px-4 pb-3 pt-4 lg:hidden">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative grid h-9 w-9 place-items-center text-[#0f2f66]" aria-label="Notifications">
              <Bell size={21} />
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div ref={profileMobileRef} className="relative">
              <button type="button" onClick={() => setIsProfileOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a5cbe] text-xs font-bold text-white">
                {derived.initials}
              </button>
              {profileMenu}
            </div>
          </div>
        </header>

        {/* ---------- SCROLLABLE CONTENT ---------- */}
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 lg:px-6 lg:pb-8 lg:pt-5">
          <div className="mx-auto grid max-w-[1260px] grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">

            {/* ================= LEFT COLUMN ================= */}
            <div className="min-w-0 space-y-5">

              {/* HERO (Phone Graphic Removed) */}
              <section className="relative flex min-h-[150px] flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a3a8a] via-[#0a53b4] to-[#0b66d0] px-6 py-6 text-white sm:min-h-[178px] sm:px-8">
                <div className="pointer-events-none absolute inset-0 opacity-40">
                  <div className="absolute -bottom-24 left-1/3 h-56 w-[120%] -rotate-6 rounded-[100%] border border-white/20" />
                  <div className="absolute -bottom-32 left-1/4 h-56 w-[120%] -rotate-3 rounded-[100%] border border-white/10" />
                  <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />
                </div>

                <div className="relative z-10 max-w-2xl">
                  <p className="text-[15px] font-medium text-blue-50 sm:text-[17px]">{greeting()},</p>
                  <div className="mt-1 flex items-center gap-2.5">
                    <h2 className="truncate text-[26px] font-extrabold uppercase leading-tight sm:text-[34px]">{derived.displayName}</h2>
                    <BadgeCheck size={28} className="shrink-0 text-emerald-400" fill="currentColor" stroke="#0a53b4" />
                  </div>
                  <p className="mt-2 text-[13px] text-blue-50 sm:text-[15px]">Your money, loans and payments in one place.</p>
                </div>
              </section>

              {/* THREE CARDS: WALLET / OUTSTANDING LOAN / CREDIT SCORE */}
              <section className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.35fr_1fr]">
                {/* Wallet */}
                <div className={`${CARD} flex flex-col p-4`}>
                  <div className="flex items-center gap-3">
                    <CardIcon icon={WalletCards} tile="bg-[#1565d8]" />
                    <p className="flex items-center gap-1 text-[14px] font-semibold text-slate-800">
                      Wallet Balance <Info size={12} className="text-slate-400" />
                    </p>
                  </div>
                  <h3 className="mt-3 text-[28px] font-extrabold leading-tight text-[#0f2f66]">KES 0.00</h3>
                  <p className="text-[13px] text-slate-500">Available funds</p>
                  <Link href="/wallet" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:brightness-105">
                    <Plus size={15} /> Add Money
                  </Link>
                  <Link href="/transactions" className="mt-3 flex items-center justify-between rounded-xl bg-[#F1F5FB] p-2.5 transition hover:bg-[#E8EEF8]">
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#1565d8]"><Clock size={16} /></span>
                      <span>
                        <span className="block text-[11px] text-slate-500">Recent Activity</span>
                        <span className="block text-[12px] font-bold text-slate-800">KES 0.00</span>
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-[#1565d8]" />
                  </Link>
                </div>

                {/* Outstanding loan */}
                <div className={`${CARD} flex flex-col p-4`}>
                  <div className="flex items-center gap-3">
                    <CardIcon icon={Landmark} tile="bg-emerald-600" />
                    <p className="text-[14px] font-semibold text-slate-800">Outstanding Loan</p>
                  </div>
                  <h3 className="mt-3 text-[28px] font-extrabold leading-tight text-[#0f2f66]">KES {formatKes(loanActive ? derived.loanOutstanding : 0)}</h3>
                  <p className="text-[13px] text-slate-500">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${ringPct}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{ringPct}%</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                    <div className="flex items-start gap-2.5">
                      <Calendar size={16} className="mt-0.5 text-slate-500" />
                      <div>
                        <p className="text-slate-500">Next Payment</p>
                        <p className="text-[13px] font-bold text-slate-900">KES {loanActive ? formatKes(derived.nextPaymentAmount) : '0'}</p>
                        <p className="text-slate-500">{loanActive ? formatDate(derived.nextPaymentDate) : '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 border-l border-slate-100 pl-3">
                      <Clock size={16} className="mt-0.5 text-slate-500" />
                      <div>
                        <p className="text-slate-500">Due In</p>
                        <p className="text-[13px] font-bold text-slate-900">{loanActive ? dueLabel : '—'}</p>
                      </div>
                    </div>
                  </div>
                  <Link href={repayHref} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-100/80 py-2.5 text-[13px] font-bold text-emerald-800 transition hover:bg-emerald-100">
                    Repay Loan <ArrowRight size={14} />
                  </Link>
                </div>

                {/* Credit score */}
                <div className={`${CARD} flex flex-col p-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-[#0f2f66]">Credit Score</h3>
                    <Link href="/credit-score" className="flex items-center gap-1 text-[11px] font-semibold text-[#0a5cbe] hover:underline">
                      View details <ArrowRight size={11} />
                    </Link>
                  </div>
                  <div className="relative mx-auto mt-2 flex w-[136px] flex-col items-center">
                    <svg width="136" height="82" viewBox="0 0 100 60">
                      <defs>
                        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor="#F43F5E" />
                          <stop offset="0.5" stopColor="#F59E0B" />
                          <stop offset="1" stopColor="#10B981" />
                        </linearGradient>
                      </defs>
                      <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#EEF2F7" strokeWidth="9" strokeLinecap="round" />
                      <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="url(#gaugeGrad)" strokeWidth="9" strokeLinecap="round" strokeDasharray={gaugeLen} strokeDashoffset={gaugeLen - (gaugeLen * derived.scorePct) / 100} />
                    </svg>
                    <span className="absolute bottom-6 text-[28px] font-extrabold leading-none text-slate-900">{derived.rawScore}</span>
                    <span className={`-mt-1 rounded-full px-4 py-0.5 text-[11px] font-bold ${derived.pill}`}>{derived.creditStatus}</span>
                  </div>
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-[#0f2f66]">
                      <Lightbulb size={13} className="text-emerald-600" /> Tips to improve your score
                    </p>
                    <ul className="space-y-1">
                      {CREDIT_TIPS.map((t) => (
                        <li key={t} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <Check size={12} className="text-emerald-600" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* QUICK ACTIONS */}
              <section className={`${CARD} p-4 sm:p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[#0f2f66]">Quick Actions</h3>
                  <Link href="/actions" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-y-5 sm:grid-cols-6">
                  {QUICK_ACTIONS.map((a) => (
                    <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-2">
                      <div className={`flex h-[60px] w-[60px] items-center justify-center rounded-full text-white shadow-sm transition-transform group-hover:scale-105 ${a.color}`}>
                        <a.icon size={24} strokeWidth={1.9} />
                      </div>
                      <span className="text-center text-[12px] font-medium text-slate-700">{a.label}</span>
                    </Link>
                  ))}
                </div>
              </section>

              {/* RECENT TRANSACTIONS */}
              <section className={`${CARD} p-4 sm:p-5`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[16px] font-bold text-[#0f2f66]">Recent Transactions</h3>
                  <Link href="/transactions" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>

                {activity.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No recent transactions found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[560px]">
                      <div className="grid grid-cols-[56px_1.4fr_1.3fr_1fr_1fr] rounded-lg bg-[#F1F5FB] px-3 py-2 text-[11px] font-semibold text-slate-500">
                        <span>Type</span><span>Description</span><span>Date &amp; Time</span><span>Amount</span><span>Status</span>
                      </div>
                      {activity.slice(0, 4).map((item: any, i) => {
                        const row = activityRow(item);
                        const dateString = item.created_at || item.occurred_at || item.date || null;
                        return (
                          <div key={i} className="grid grid-cols-[56px_1.4fr_1.3fr_1fr_1fr] items-center border-b border-slate-100 px-3 py-3 last:border-0">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${row.iconClass}`}>
                              <row.Icon size={15} />
                            </div>
                            <div>
                              <p className="text-[12px] font-bold text-slate-900">{row.title}</p>
                              <p className="text-[10px] text-slate-500">{row.sub}</p>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {formatDate(dateString)} &nbsp;•&nbsp; {formatTime(dateString)}
                            </p>
                            <p className={`text-[13px] font-extrabold ${row.amountClass}`}>
                              {item.amount ? `${row.sign}KES ${formatKes(item.amount)}` : '—'}
                            </p>
                            <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-semibold ${row.statusClass}`}>{row.status}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="min-w-0 space-y-5">

              {/* LOAN SUMMARY */}
              <section className={`${CARD} p-4 sm:p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[17px] font-bold text-[#0f2f66]">Loan Summary</h3>
                  <Link href="/loans" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">
                    View all <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="mb-3 flex items-center justify-between rounded-xl bg-[#EEF4FC] p-3.5">
                  <div className="flex items-center gap-3">
                    <CardIcon icon={WalletCards} tile="bg-[#1565d8]" />
                    <div>
                      <p className="text-[12px] font-medium text-slate-600">Current Loan</p>
                      <p className="text-[22px] font-extrabold leading-tight text-[#0f2f66]">KES {formatKes(loanActive ? derived.loanOutstanding : 0)}</p>
                      <p className="text-[11px] text-slate-500">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>
                    </div>
                  </div>
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                    <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                      <circle cx="32" cy="32" r={ringR} fill="none" stroke="#DCE6F5" strokeWidth="6" />
                      <circle cx="32" cy="32" r={ringR} fill="none" stroke="#0f9d74" strokeWidth="6" strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringC - (ringC * ringPct) / 100} />
                    </svg>
                    <span className="absolute text-[13px] font-extrabold text-[#0f2f66]">{ringPct}%</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between py-3.5">
                    <span className="flex items-center gap-3 text-[13px] text-slate-500"><Calendar size={16} /> Next Payment</span>
                    <span className="text-[13px] font-bold text-slate-900">{loanActive ? formatDate(derived.nextPaymentDate) : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-3.5">
                    <span className="flex items-center gap-3 text-[13px] text-slate-500"><Receipt size={16} /> Monthly Installment</span>
                    <span className="text-[13px] font-bold text-slate-900">KES {loanActive ? formatKes(derived.installment) : '0'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3.5">
                    <span className="flex items-center gap-3 text-[13px] text-slate-500"><ClipboardList size={16} /> Loan Status</span>
                    {loanActive ? (
                      <span className="rounded-full bg-emerald-50 px-4 py-1 text-[12px] font-bold text-emerald-600">{activeLoan.status === 'OVERDUE' ? 'Overdue' : 'Active'}</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-4 py-1 text-[12px] font-bold text-slate-600">None</span>
                    )}
                  </div>
                </div>
              </section>

              {/* BIGGER LOAN PROMO */}
              <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#E9F8F0] to-[#D3F0E1] p-5">
                <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-emerald-300/40" />
                <div className="pointer-events-none absolute -bottom-14 right-0 h-36 w-44 rounded-[100%] bg-emerald-400/30" />
                <div className="relative z-10 max-w-[64%]">
                  <h3 className="text-[19px] font-bold text-[#0f2f66]">Need a bigger loan?</h3>
                  <p className="mb-4 mt-2 text-[13px] leading-snug text-slate-700">Get up to KES 50,000 with flexible repayment terms.</p>
                  <Link href="/apply/loan" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:brightness-105">
                    Apply Now <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="absolute bottom-4 right-5 z-10">
                  <div className="relative">
                    <div className="flex h-24 w-[72px] rotate-3 flex-col items-start gap-1.5 rounded-md bg-white p-2.5 shadow-lg">
                      <span className="text-[6px] font-extrabold text-slate-700">LOAN</span>
                      <div className="h-1.5 w-8 rounded bg-slate-300" />
                      <div className="h-1 w-10 rounded bg-slate-200" />
                      <div className="h-1 w-7 rounded bg-slate-200" />
                      <div className="h-1 w-9 rounded bg-slate-200" />
                    </div>
                    <div className="absolute -bottom-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow-lg">
                      <Check size={17} strokeWidth={3} className="text-white" />
                    </div>
                  </div>
                </div>
              </section>

              {/* NEED HELP */}
              <section className={`${CARD} p-5`}>
                <div className="flex items-center gap-4">
                  <Headphones size={40} strokeWidth={1.4} className="shrink-0 text-[#0f2f66]" />
                  <div>
                    <h3 className="text-[16px] font-bold text-[#0f2f66]">Need help?</h3>
                    <p className="text-[12px] text-slate-500">Our support team is here for you.</p>
                  </div>
                </div>
                <Link href="/support" className="mx-auto mt-4 flex w-[78%] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 py-2.5 text-[13px] font-semibold text-[#0a5cbe] transition hover:bg-blue-50">
                  Contact Support <ArrowRight size={14} />
                </Link>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active ? 'text-[#0a5cbe]' : 'text-slate-500'}`}>
                <Icon size={21} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
                {label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setIsSidebarOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold text-slate-500">
            <MoreHorizontal size={21} />
            More
          </button>
        </div>
      </nav>

      {/* ==================== MOBILE "MORE" DRAWER ==================== */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-gradient-to-b from-[#0b2a57] to-[#081d3f] text-white shadow-2xl">
            <div className="flex items-center justify-between px-5 pb-2 pt-6">
              <Logo dark />
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-4">
              <NavLinks pathname={pathname} onNavigate={() => setIsSidebarOpen(false)} />
              <Link href="/terms" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-4 rounded-xl px-5 py-3.5 text-[15px] font-medium text-slate-200 hover:bg-white/5">
                <FileText size={21} strokeWidth={1.7} className="text-slate-200" /> Terms &amp; Conditions
              </Link>
            </nav>
            <div className="p-5">
              <button onClick={onLogout} disabled={loggingOut} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0f294d] disabled:opacity-60">
                <LogOut size={18} /> {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </aside>
        </div>
      )}

      <KycModal open={showKycModal} onClose={dismissKycModal} data={kycData} />
    </div>
  );
}