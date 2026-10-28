'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowRight, Bell, Check, CheckCircle2, ChevronDown, HelpCircle, LogOut, Receipt, User,
  WalletCards, ArrowLeftRight, FileText, Smartphone, PiggyBank, Banknote, Home, Shield,
  Calendar, Send, Briefcase, Leaf, Search, X, Landmark, MoreHorizontal, Lightbulb, Info,
  ClipboardList,
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

/* ------------------------------------------------------------------ */
/*  Static placeholders (replace with real API data when available)    */
/* ------------------------------------------------------------------ */
const ACCOUNT_BALANCE = 12450;
const SAVINGS_BALANCE = 3200;
const MPESA_BALANCE = 2480;

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

const TRANSACTIONS = [
  { title: 'M-PESA Deposit', date: '12 Oct 2026 • 10:24 AM', amount: '+ KES 1,000', type: 'in', icon: ArrowLeftRight, tile: 'bg-emerald-500' },
  { title: 'Loan Repayment', date: '10 Oct 2026 • 04:12 PM', amount: '- KES 500', type: 'out', icon: WalletCards, tile: 'bg-blue-600' },
  { title: 'Airtime Purchase', date: '08 Oct 2026 • 09:22 AM', amount: '- KES 200', type: 'out', icon: Smartphone, tile: 'bg-orange-500' },
  { title: 'KPLC Bill Payment', date: '05 Oct 2026 • 11:05 AM', amount: '- KES 1,250', type: 'out', icon: FileText, tile: 'bg-blue-500' },
];

/* ------------------------------------------------------------------ */
/*  Reusable Components                                                */
/* ------------------------------------------------------------------ */
function LoadingState() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F7FB]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a5cbe] border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard...</p>
    </div>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
        <Leaf size={24} className="text-emerald-500" fill="currentColor" />
      </div>
      <div className="leading-tight">
        <p className={`text-[20px] tracking-tight ${dark ? 'text-white' : 'text-[#0f2f66]'}`}>
          <span className="font-extrabold">Imara</span> <span className="font-medium">Credit</span>
        </p>
        <p className={`text-[8px] font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
          Loans • Payments • Financial Growth
        </p>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium transition-colors ${
              active ? 'bg-[#1565d8] text-white shadow-lg shadow-blue-900/30' : 'text-slate-200 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={19} strokeWidth={1.8} className={active ? 'text-white' : 'text-slate-300'} />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function SummaryCard({
  icon: Icon, tile, label, value, sub, href, cta,
}: {
  icon: any; tile: string; label: string; value: string; sub: string; href: string; cta: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,41,77,0.05)]">
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl text-white ${tile}`}>
        <Icon size={22} />
      </div>
      <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-600">
        {label} <Info size={12} className="text-slate-400" />
      </p>
      <h3 className="mt-1 text-[19px] font-extrabold leading-tight text-slate-900 sm:text-[20px]">KES {value}</h3>
      <p className="mb-3 mt-0.5 text-[11px] text-slate-500">{sub}</p>
      <Link
        href={href}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-2 text-[11px] font-bold text-[#0a5cbe] transition hover:bg-blue-100"
      >
        {cta} <ArrowRight size={12} />
      </Link>
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
    if (nextInst) {
      const due = Number(nextInst.total_due || 0);
      const paid = Number(nextInst.total_paid || 0);
      const penalty = Number(nextInst.penalty_due || 0);
      nextPaymentAmount = String(Math.max(0, (due + penalty) - paid));
    }
    const nextPaymentDate = nextInst ? nextInst.due_date : activeLoan ? loanDueDate(activeLoan) : null;

    const rawScore = eligibility?.credit_limit?.credit_score || 50;
    let creditStatus = 'Poor';
    let pill = 'bg-rose-50 text-rose-600';
    if (rawScore >= 700) { creditStatus = 'Excellent'; pill = 'bg-emerald-50 text-emerald-600'; }
    else if (rawScore >= 500) { creditStatus = 'Good'; pill = 'bg-blue-50 text-blue-600'; }
    else if (rawScore >= 300) { creditStatus = 'Fair'; pill = 'bg-amber-50 text-amber-600'; }
    // Supports both 0-100 and 300-850 style scores
    const scoreMax = rawScore > 100 ? 850 : 100;
    const scorePct = Math.min(100, Math.max(0, (rawScore / scoreMax) * 100));

    return { displayName, initials, progress, nextPaymentAmount, nextPaymentDate, rawScore, creditStatus, pill, scorePct, loanOutstanding, totalDue };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (loading || !borrower || !derived) return <LoadingState />;

  const loanActive = activeLoan !== null;
  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;
  const ringPct = loanActive ? derived.progress : 0;
  const gaugeLen = Math.PI * 40;

  /* ---------- Profile dropdown (shared desktop / mobile) ---------- */
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

      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden w-[250px] shrink-0 flex-col bg-gradient-to-b from-[#0b2a57] to-[#0a2247] text-white lg:flex">
        <div className="px-5 pb-2 pt-7">
          <Logo dark />
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-4">
          <NavLinks pathname={pathname} />
        </nav>

        {/* Promo footer */}
        <div className="relative m-4 overflow-hidden rounded-2xl bg-white/[0.06] p-5">
          <svg className="pointer-events-none absolute -bottom-2 -right-2 h-32 w-48" viewBox="0 0 200 130" fill="none">
            <path d="M0 130 C 60 110, 120 70, 200 0 L200 130 Z" fill="url(#sw1)" opacity="0.9" />
            <path d="M20 130 C 80 120, 140 90, 200 40 L200 130 Z" fill="#0a5cbe" opacity="0.7" />
            <defs>
              <linearGradient id="sw1" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#16a34a" />
                <stop offset="1" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <Leaf size={24} className="relative mb-3 text-emerald-400" fill="currentColor" />
          <p className="relative text-[15px] font-bold leading-snug">Your financial<br />journey, made easier.</p>
          <p className="relative mt-2 text-[10px] text-slate-300">Borrow • Save • Pay • Grow</p>
          <div className="h-14" />
        </div>
      </aside>

      {/* ==================== MAIN COLUMN ==================== */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* ---------- DESKTOP HEADER ---------- */}
        <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8 lg:flex">
          <div className="flex w-full max-w-md items-center gap-3 rounded-full bg-[#EEF3FA] px-5 py-2.5">
            <Search size={17} className="text-slate-500" />
            <input type="text" placeholder="Search services, transactions, loans..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          <div className="flex items-center gap-5">
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-[#0f2f66] transition hover:bg-slate-50">
              <Bell size={21} />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div ref={profileRef} className="relative flex cursor-pointer items-center gap-3" onClick={() => setIsProfileOpen((v) => !v)}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0a5cbe] text-sm font-bold text-white">{derived.initials}</div>
              <p className="text-[13px] font-bold text-slate-900">{derived.displayName}</p>
              <ChevronDown size={15} className="text-slate-500" />
              {profileMenu}
            </div>
          </div>
        </header>

        {/* ---------- MOBILE HEADER ---------- */}
        <header className="flex shrink-0 items-center justify-between bg-white px-4 pb-3 pt-4 lg:hidden">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative grid h-9 w-9 place-items-center text-[#0f2f66]">
              <Bell size={21} />
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div ref={profileRef} className="relative">
              <button type="button" onClick={() => setIsProfileOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a5cbe] text-xs font-bold text-white">
                {derived.initials}
              </button>
              {profileMenu}
            </div>
          </div>
        </header>

        {/* ---------- SCROLLABLE CONTENT ---------- */}
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">

            {/* HERO */}
            <section className="relative flex min-h-[132px] items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a3a8a] via-[#0a53b4] to-[#0b66d0] px-5 py-5 text-white sm:min-h-[150px] sm:px-8 xl:col-start-1">
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute -bottom-24 left-1/3 h-56 w-[120%] -rotate-6 rounded-[100%] border border-white/20" />
                <div className="absolute -bottom-32 left-1/4 h-56 w-[120%] -rotate-3 rounded-[100%] border border-white/10" />
                <div className="absolute -right-10 -top-16 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />
              </div>

              <div className="relative z-10">
                <p className="text-[14px] font-medium text-blue-100 sm:text-[15px]">{greeting()},</p>
                <h2 className="mt-0.5 text-[22px] font-extrabold leading-tight sm:text-[28px]">{derived.displayName}</h2>
                <p className="mt-1 text-[12px] text-blue-100/90 sm:text-[13px]">Your financial partner, always.</p>
              </div>

              <div className="relative z-10 mr-3 sm:mr-0">
                <div className="relative h-[104px] w-[62px] rotate-[8deg] rounded-[14px] border-[3px] border-slate-900 bg-slate-900 shadow-2xl sm:h-[128px] sm:w-[76px]">
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-[10px] bg-gradient-to-b from-emerald-400 to-emerald-600 text-white">
                    <Smartphone size={16} className="mb-1 opacity-80" />
                    <span className="text-[8px] font-extrabold tracking-wide">M-PESA</span>
                  </div>
                  <div className="absolute -bottom-3 -right-5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-emerald-500 shadow-lg sm:h-10 sm:w-10">
                    <Check size={20} strokeWidth={3} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="relative z-10 hidden max-w-[170px] text-[12px] font-medium leading-snug text-blue-50 sm:block">
                <p>Send money, pay bills, buy airtime and more — all in one place.</p>
                <div className="mt-2 h-[3px] w-6 rounded bg-emerald-400" />
              </div>
            </section>

            {/* SUMMARY CARDS */}
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:col-start-1">
              <SummaryCard icon={Landmark} tile="bg-[#1565d8]" label="Account Balance" value={formatKes2(ACCOUNT_BALANCE)} sub="Available funds" href="/wallet" cta="View details" />
              <SummaryCard icon={PiggyBank} tile="bg-emerald-500" label="Savings" value={formatKes2(SAVINGS_BALANCE)} sub="Your savings balance" href="/savings" cta="View savings" />
              <SummaryCard icon={WalletCards} tile="bg-violet-500" label="Loan Balance" value={formatKes2(loanActive ? derived.loanOutstanding : 0)} sub={`of KES ${formatKes(loanActive ? derived.totalDue : 0)} total`} href="/loans" cta="View loan" />
              <SummaryCard icon={Smartphone} tile="bg-emerald-500" label="M-PESA Balance" value={formatKes2(MPESA_BALANCE)} sub="Your M-PESA wallet" href="/m-pesa" cta="Send money" />
            </section>

            {/* QUICK ACTIONS */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,41,77,0.05)] sm:p-5 xl:col-start-1">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#0f2f66]">Quick Actions</h3>
                <Link href="/actions" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-y-5 sm:grid-cols-6">
                {QUICK_ACTIONS.map((a) => (
                  <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-2">
                    <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-white shadow-sm transition-transform group-hover:scale-105 ${a.color}`}>
                      <a.icon size={24} strokeWidth={1.9} />
                    </div>
                    <span className="text-center text-[11px] font-semibold text-slate-700">{a.label}</span>
                  </Link>
                ))}
              </div>
            </section>

            {/* RIGHT COLUMN (below quick actions on mobile, side column on xl) */}
            <div className="space-y-4 sm:space-y-5 xl:col-start-2 xl:row-span-4 xl:row-start-1">

              {/* LOAN SUMMARY */}
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,41,77,0.05)] sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[#0f2f66]">Loan Summary</h3>
                  <Link href="/loans" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">
                    View details <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50/70 p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1565d8] text-white">
                      <WalletCards size={21} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">Current Loan</p>
                      <p className="text-[19px] font-extrabold leading-tight text-[#0f2f66]">KES {formatKes(loanActive ? derived.loanOutstanding : 0)}</p>
                      <p className="text-[10px] text-slate-500">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>
                    </div>
                  </div>
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                    <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                      <circle cx="32" cy="32" r={ringR} fill="none" stroke="#DCE6F5" strokeWidth="6" />
                      <circle cx="32" cy="32" r={ringR} fill="none" stroke="#1565d8" strokeWidth="6" strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringC - (ringC * ringPct) / 100} />
                    </svg>
                    <span className="absolute text-[13px] font-extrabold text-[#0f2f66]">{ringPct}%</span>
                  </div>
                </div>

                <div className="mb-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500">
                      <Calendar size={16} />
                      <div>
                        <p className="text-[11px] font-medium">Next Payment</p>
                        <p className="text-[14px] font-extrabold text-slate-900">KES {loanActive ? formatKes(derived.nextPaymentAmount) : '0'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                      <Calendar size={13} className="text-slate-400" />
                      {loanActive ? formatDate(derived.nextPaymentDate) : '—'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-slate-500">
                      <ClipboardList size={16} />
                      <span className="text-[12px] font-medium">Loan Status</span>
                    </div>
                    {loanActive ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600">Active</span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">None</span>
                    )}
                  </div>
                </div>

                <Link
                  href={activeLoan ? `/repay/${activeLoan.id}` : '/apply/loan'}
                  className="flex w-full items-center justify-center rounded-xl bg-[#0a5cbe] py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  {activeLoan ? 'Make a Repayment' : 'Apply for a Loan'}
                </Link>
              </section>

              {/* CREDIT SCORE */}
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,41,77,0.05)] sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[#0f2f66]">Credit Score</h3>
                  <Link href="/credit-score" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">
                    View details <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex w-[112px] shrink-0 flex-col items-center">
                    <svg width="112" height="68" viewBox="0 0 100 60">
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
                    <span className="absolute bottom-5 text-[22px] font-extrabold leading-none text-slate-900">{derived.rawScore}</span>
                    <span className={`mt-1 rounded-full px-3 py-0.5 text-[11px] font-bold ${derived.pill}`}>{derived.creditStatus}</span>
                  </div>
                  <div className="flex-1 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-[11px] leading-snug text-slate-600">
                    <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[#0f2f66]">
                      <Lightbulb size={13} className="text-[#0a5cbe]" /> Credit Tips
                    </p>
                    Keep your repayments on time to improve your score.
                  </div>
                </div>
              </section>

              {/* BIGGER LOAN PROMO */}
              <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a3a8a] to-[#0a5cbe] p-5 text-white">
                <div className="relative z-10 max-w-[62%]">
                  <h3 className="text-[17px] font-bold">Need a bigger loan?</h3>
                  <p className="mb-4 mt-1 text-[12px] leading-snug text-blue-100">Get up to KES 50,000 with flexible repayment terms.</p>
                  <Link href="/apply/loan" className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-[#06304a] transition hover:bg-emerald-300">
                    Apply Now <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="absolute bottom-3 right-4 z-0">
                  <div className="relative">
                    <div className="flex h-24 w-[68px] rotate-6 flex-col items-start gap-1.5 rounded-md bg-white p-2.5 shadow-lg">
                      <div className="h-1.5 w-8 rounded bg-blue-200" />
                      <div className="h-1 w-10 rounded bg-slate-200" />
                      <div className="h-1 w-7 rounded bg-slate-200" />
                      <div className="h-1 w-9 rounded bg-slate-200" />
                    </div>
                    <div className="absolute -bottom-2 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-lg">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* RECENT TRANSACTIONS */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(15,41,77,0.05)] sm:p-5 xl:col-start-1">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#0f2f66]">Recent Transactions</h3>
                <Link href="/transactions" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div>
                {TRANSACTIONS.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-100 py-3.5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${tx.tile}`}>
                        <tx.icon size={18} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">{tx.title}</p>
                        <p className="text-[11px] text-slate-500">{tx.date}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className={`text-[13px] font-extrabold ${tx.type === 'in' ? 'text-emerald-600' : 'text-slate-900'}`}>{tx.amount}</p>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Success</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
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
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-gradient-to-b from-[#0b2a57] to-[#0a2247] text-white shadow-2xl">
            <div className="flex items-center justify-between px-5 pb-2 pt-6">
              <Logo dark />
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-4">
              <NavLinks pathname={pathname} onNavigate={() => setIsSidebarOpen(false)} />
              <Link href="/terms" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 hover:bg-white/5">
                <FileText size={19} strokeWidth={1.8} className="text-slate-300" /> Terms & Conditions
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