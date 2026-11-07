'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Clock3, Loader2, Receipt, ShieldAlert,
  Home, Shield, Compass, FileText, HelpCircle, LogOut, Menu, X, WalletCards, Smartphone,
  PiggyBank, ArrowLeftRight, Briefcase, Leaf, Search, Bell, ChevronDown, ChevronLeft, 
  ChevronRight, User
} from 'lucide-react';
import { loans as loansApi } from '@/lib/loans';
import type { Loan, LoanScheduleEntry } from '@/lib/loans';
import { imara } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function formatKes(amount: string | number | null | undefined): string {
  const n = toNumber(amount);
  return Math.round(n).toLocaleString('en-KE');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING':     return 'Awaiting approval';
    case 'APPROVED':    return 'Approved, not yet disbursed';
    case 'DISBURSED':   return 'Disbursed, activating';
    case 'ACTIVE':      return 'Active';
    case 'OVERDUE':     return 'Overdue';
    case 'PAID':        return 'Paid in full';
    case 'REJECTED':    return 'Rejected';
    case 'DEFAULTED':   return 'Defaulted';
    case 'WRITTEN_OFF': return 'Written off';
    default:            return status;
  }
}

function statusTone(status: string) {
  switch (status) {
    case 'ACTIVE': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 size={18} strokeWidth={2.4} /> };
    case 'OVERDUE': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: <AlertTriangle size={18} strokeWidth={2.4} /> };
    case 'PAID': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: <CheckCircle2 size={18} strokeWidth={2.4} /> };
    case 'PENDING':
    case 'APPROVED':
    case 'DISBURSED': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: <Clock3 size={18} strokeWidth={2.4} /> };
    default: return { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700', icon: <Receipt size={18} strokeWidth={2.4} /> };
  }
}

function instalmentStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Upcoming';
    case 'PARTIAL': return 'Partially paid';
    case 'PAID':    return 'Paid';
    case 'OVERDUE': return 'Overdue';
    case 'WAIVED':  return 'Waived';
    default:        return status;
  }
}

function instalmentStatusTone(status: string): string {
  switch (status) {
    case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PARTIAL': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'OVERDUE': return 'bg-red-50 text-red-700 border-red-200';
    case 'WAIVED': return 'bg-slate-100 text-slate-600 border-slate-200';
    default: return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

function BreakdownRow({ label, value, emphasize }: { label: string; value: string; emphasize?: 'bold' | 'red'; }) {
  const labelClass = emphasize === 'bold' ? 'text-sm font-bold text-slate-900' : 'text-sm text-slate-500';
  const valueClass = emphasize === 'bold' ? 'text-sm font-bold text-slate-900 tabular-nums' : emphasize === 'red' ? 'text-sm font-bold text-red-600 tabular-nums' : 'text-sm font-semibold text-slate-700 tabular-nums';
  return (
    <div className="flex items-center justify-between py-3">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const pathname = usePathname() || '/loans';
  const { id } = use(params);

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<LoanScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Layout states
  const [collapsed, setCollapsed] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState('User');
  const [initials, setInitials] = useState('SC');
  
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch loan and profile in parallel
        const [res, meRes] = await Promise.allSettled([
          loansApi.getLoan(id),
          imara.me()
        ]);

        if (cancelled) return;

        if (res.status === 'fulfilled') {
          setLoan(res.value.data.loan);
          setSchedule(res.value.data.schedule || []);
        } else {
          setError(res.reason?.message || 'Failed to load loan.');
        }

        if (meRes.status === 'fulfilled') {
          const b = meRes.value.data;
          const name = [b.first_name, b.last_name].filter(Boolean).join(' ').trim() || b.email.split('@')[0];
          setBorrowerName(name);
          setInitials(name.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

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
    try { await imara.logout(); } catch {}
    finally { router.push('/login'); }
  }

  const derived = useMemo(() => {
    if (!loan) return null;

    const outstandingPrincipal = toNumber(loan.outstanding_principal);
    const outstandingInterest  = toNumber(loan.outstanding_interest);
    const outstandingFees      = toNumber(loan.outstanding_fees);
    const outstandingPenalty   = toNumber(loan.outstanding_penalty);
    const outstandingTotal     = toNumber(loan.outstanding_total);

    const principal = toNumber(loan.principal_amount);
    const repaid = Math.max(0, principal - outstandingPrincipal);
    const progressPct = principal > 0 ? Math.min(100, Math.max(0, Math.round((repaid / principal) * 100))) : 0;

    const nextInst = schedule.find((s) => s.status !== 'PAID' && s.status !== 'WAIVED' && toNumber(s.total_paid) < toNumber(s.total_due)) || null;
    const nextInstOutstanding = nextInst ? Math.max(0, toNumber(nextInst.total_due) - toNumber(nextInst.total_paid)) : 0;
    const nextInstDue = nextInst ? nextInstOutstanding + outstandingPenalty : outstandingTotal;

    return {
      outstandingPrincipal, outstandingInterest, outstandingFees, outstandingPenalty, outstandingTotal,
      progressPct, nextInst, nextInstDue, hasPenalty: outstandingPenalty > 0,
    };
  }, [loan, schedule]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a5cbe] border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading loan details...</p>
      </div>
    );
  }

  if (error || !loan || !derived) {
    return (
      <div className="fixed inset-0 z-[9999] flex h-screen w-full items-center justify-center bg-[#F4F7FB] p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Could not load loan</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">{error || 'Loan not found.'}</p>
          <button onClick={() => router.push('/dashboard')} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#0a5cbe] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#084a99]">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tone = statusTone(loan.status);
  const canRepay = loan.status === 'ACTIVE' || loan.status === 'OVERDUE';

  const profileMenu = isProfileOpen && (
    <div className="absolute right-0 top-full z-50 mt-3 w-56 origin-top-right rounded-xl border border-slate-100 bg-white p-2 shadow-xl">
      <button type="button" onClick={() => router.push('/profile')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50">
        <User size={16} className="text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">My profile</span>
      </button>
      <div className="my-1 border-t border-slate-100" />
      <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-red-50 disabled:opacity-60">
        <LogOut size={16} className="text-red-600" />
        <span className="text-sm font-bold text-red-600">Log out</span>
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex overflow-hidden bg-[#F4F7FB] font-sans text-slate-800">
      
      {/* ==================== DESKTOP SIDEBAR ==================== */}
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
          <Shield size={13} />
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
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0a5cbe] text-sm font-bold text-white">{initials}</div>
              <p className="text-[13px] font-bold uppercase text-slate-900">{borrowerName}</p>
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
                {initials}
              </button>
              {profileMenu}
            </div>
          </div>
        </header>

        {/* ---------- SCROLLABLE CONTENT ---------- */}
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          
          <div className="mx-auto max-w-[1000px]">
            
            {/* BACK BUTTON & TITLE */}
            <div className="mb-6 flex items-center gap-4">
              <button onClick={() => router.back()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-50">
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Loan Details</p>
                <h1 className="text-xl font-bold text-slate-900 leading-tight font-mono">{loan.loan_reference}</h1>
              </div>
            </div>

            {/* STATUS BANNER */}
            <div className={`mb-6 flex items-center gap-3 rounded-2xl border ${tone.border} ${tone.bg} px-5 py-4`}>
              <div className={`shrink-0 ${tone.text}`}>{tone.icon}</div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${tone.text}`}>{loan.status}</p>
                <p className={`mt-0.5 text-base font-bold ${tone.text}`}>{statusLabel(loan.status)}</p>
              </div>
            </div>

            {/* PENALTY ALERT */}
            {derived.hasPenalty && (
              <div className="mb-6 flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <ShieldAlert size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-700/80">Late payment fee</p>
                  <p className="mt-1 text-base font-bold text-red-900">KES {formatKes(derived.outstandingPenalty)} penalty applied</p>
                  <p className="mt-1 text-sm text-red-800/90">This fee was added because an instalment was paid late. It has been included in the outstanding balance below.</p>
                </div>
              </div>
            )}

            {/* HERO CARD */}
            <div className="mb-6 overflow-hidden rounded-2xl bg-[#0a5cbe] p-6 sm:p-8 text-white shadow-lg">
              <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Total Outstanding</p>
                  <p className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">KES {formatKes(derived.outstandingTotal)}</p>
                  <p className="mt-2 text-sm font-medium text-blue-100">{derived.progressPct}% repaid of KES {formatKes(loan.principal_amount)} principal</p>
                </div>
                <div className="w-full max-w-[200px] sm:w-1/3">
                  <div className="h-2 w-full rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-[#10B981] transition-all" style={{ width: `${derived.progressPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* DESKTOP GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                
                {/* NEXT PAYMENT */}
                {derived.nextInst && (
                  <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Next Payment</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-900">Instalment {derived.nextInst.installment_no}</p>
                        <p className="mt-1 text-sm text-slate-500">Due {formatDate(derived.nextInst.due_date)}</p>
                      </div>
                      <p className="text-2xl font-extrabold text-slate-900 tabular-nums">KES {formatKes(derived.nextInstDue)}</p>
                    </div>
                  </div>
                )}

                {/* BREAKDOWN */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Breakdown</h3>
                  <div className="divide-y divide-slate-100">
                    <BreakdownRow label="Principal outstanding" value={`KES ${formatKes(derived.outstandingPrincipal)}`} />
                    <BreakdownRow label="Interest outstanding" value={`KES ${formatKes(derived.outstandingInterest)}`} />
                    {derived.outstandingFees > 0 && <BreakdownRow label="Fees outstanding" value={`KES ${formatKes(derived.outstandingFees)}`} />}
                    {derived.hasPenalty && <BreakdownRow label="Late payment fee" value={`KES ${formatKes(derived.outstandingPenalty)}`} emphasize="red" />}
                    <BreakdownRow label="Total due" value={`KES ${formatKes(derived.outstandingTotal)}`} emphasize="bold" />
                  </div>
                </div>

                {/* TERMS */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Terms</h3>
                  <div className="divide-y divide-slate-100">
                    <BreakdownRow label="Principal" value={`KES ${formatKes(loan.principal_amount)}`} />
                    <BreakdownRow label="Interest" value={`KES ${formatKes(loan.interest_amount)}`} />
                    <BreakdownRow label="Total to repay" value={`KES ${formatKes(loan.total_due)}`} />
                    <BreakdownRow label="Term" value={`${loan.term_days} days`} />
                    <BreakdownRow label="Frequency" value={loan.repayment_frequency || '—'} />
                    <BreakdownRow label="Interest rate" value={`${loan.interest_rate}% ${(loan.interest_period || '').toLowerCase()}`} />
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                
                {/* TIMELINE */}
                <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-100">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Timeline</h3>
                  <div className="divide-y divide-slate-100">
                    <BreakdownRow label="Requested" value={formatDate(loan.requested_at)} />
                    <BreakdownRow label="Approved" value={formatDate(loan.approved_at)} />
                    <BreakdownRow label="Disbursed" value={formatDate(loan.disbursed_at)} />
                    <BreakdownRow label="First due date" value={formatDate(loan.first_due_date)} />
                    <BreakdownRow label="Maturity" value={formatDate(loan.maturity_date)} />
                    <BreakdownRow label="Closed" value={formatDate(loan.closed_at)} />
                  </div>
                </div>

                {/* SCHEDULE */}
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Repayment Schedule</h3>
                    {schedule.length > 0 && (
                      <span className="text-xs font-bold text-slate-500">
                        {schedule.filter((s) => s.status === 'PAID').length}/{schedule.length} paid
                      </span>
                    )}
                  </div>

                  {schedule.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-slate-500">No repayment schedule yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                      {schedule.map((row) => {
                        const totalDue = toNumber(row.total_due);
                        const paid = toNumber(row.total_paid);
                        const penaltyDue = toNumber(row.penalty_due);
                        const outstandingOnRow = Math.max(0, totalDue - paid) + penaltyDue;
                        const isPaid = row.status === 'PAID';

                        return (
                          <div key={row.id || row.installment_no} className="p-4 sm:p-5 transition hover:bg-slate-50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EEF3FA] text-[#0a5cbe]'}`}>
                                  {isPaid ? <CheckCircle2 size={18} /> : row.installment_no}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">Instalment {row.installment_no}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">Due {formatDate(row.due_date)}</p>
                                  {penaltyDue > 0 && (
                                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                                      <AlertTriangle size={12} /> Includes KES {formatKes(penaltyDue)} late fee
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900 tabular-nums">KES {formatKes(outstandingOnRow)}</p>
                                <p className={`mt-1 text-xs tabular-nums ${isPaid ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                  Paid KES {formatKes(paid)}
                                </p>
                                <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${instalmentStatusTone(row.status)}`}>
                                  {instalmentStatusLabel(row.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="mt-12 text-center text-xs font-medium text-slate-400">
              IMARA CREDIT · {loan.currency}
            </div>

          </div>
        </main>
      </div>

      {/* MOBILE STICKY CTA */}
      {canRepay && (
        <div className="fixed bottom-[64px] left-0 z-40 w-full border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <Link href={`/repay/${loan.id}`} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a5cbe] text-sm font-bold text-white shadow-sm transition hover:bg-[#084a99]">
            Repay Now <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {[
            { href: '/dashboard', label: 'Home', icon: Home },
            { href: '/loans', label: 'Loans', icon: WalletCards },
            { href: '/payments', label: 'Payments', icon: Receipt },
            { href: '/savings', label: 'Savings', icon: PiggyBank },
          ].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active ? 'text-[#0a5cbe]' : 'text-slate-500'}`}>
                <Icon size={21} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}