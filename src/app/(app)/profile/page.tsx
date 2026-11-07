'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, ChevronRight, FileText, HelpCircle, Info, Loader2, Lock, Shield, ShieldAlert,
  ShieldCheck, TrendingUp, WalletCards, Home, Compass, User, ArrowRight, Receipt, 
  Smartphone, PiggyBank, ArrowLeftRight, Briefcase, Leaf, Search, X, LogOut, ChevronDown,
  ChevronLeft
} from 'lucide-react';
import type { ReactNode } from 'react';
import { imara, ImaraApiError } from '@/lib/api';
import { loans as loansApi } from '@/lib/loans';
import type { Eligibility } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';

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

/* ------------------------------------------------------------------ */
/*  UI Helpers                                                         */
/* ------------------------------------------------------------------ */
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-gray-100 bg-white px-5 py-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">
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
      className="flex w-full items-center gap-3.5 border-b border-gray-100 bg-white px-5 py-3.5 text-left transition active:bg-gray-50 last:border-b-0"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#EEF3FA] text-[#0a5cbe]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold tracking-tight text-gray-900">
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-[11px] font-medium text-gray-500">{hint}</p>
        )}
      </div>

      <ChevronRight size={16} className="shrink-0 text-gray-400" strokeWidth={2.2} />
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-bold tracking-tight text-gray-900 tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10.5px] font-medium text-gray-400">{sub}</p>
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
          className="text-[#0a5cbe]/20"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-[#0a5cbe]"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[12px] font-bold leading-none tracking-tight text-[#0a5cbe] tabular-nums">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

function KycCard({
  kyc,
  onAction,
}: {
  kyc: KycStatusResponse;
  onAction: () => void;
}) {
  const { kycStatus, progress, submittedAt, verifiedAt, rejectionReason } = kyc;

  if (kycStatus === 'VERIFIED') {
    return (
      <div className="overflow-hidden rounded-2xl bg-[#0a5cbe] px-5 py-5 text-white shadow-[0_10px_28px_-12px_rgba(10,92,190,0.5)]">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              KYC status
            </p>
            <p className="mt-1 text-[15px] font-bold tracking-tight text-white">
              Profile verified
            </p>
            {verifiedAt && (
              <p className="mt-0.5 text-[11px] text-white/80">
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

  if (kycStatus === 'SUBMITTED') {
    return (
      <div className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 px-5 py-5">
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

  if (kycStatus === 'REJECTED') {
    return (
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50 px-5 py-5">
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a5cbe] px-4 py-3 text-[13px] font-bold tracking-tight text-white transition active:scale-[0.985]"
        >
          Review and resubmit
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a5cbe] px-4 py-3 text-[13px] font-bold tracking-tight text-white transition active:scale-[0.985]"
      >
        Complete your profile
        <ChevronRight size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F7FB]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a5cbe] border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-slate-500">Loading your profile...</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const router = useRouter();
  const pathname = usePathname() || '/profile';

  const [borrower, setBorrower] = useState<BorrowerProfile | null>(null);
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Layout states
  const [collapsed, setCollapsed] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meRes, kycRes, eligRes] = await Promise.allSettled([
          imara.me(),
          getKycStatus(),
          loansApi.getEligibility(),
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
        }

        if (eligRes.status === 'fulfilled') {
          setEligibility(eligRes.value.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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
    try { await imara.logout(); } catch {}
    finally {
      try {
        window.sessionStorage.removeItem('imara.apply.draft.v1');
      } catch {}
      router.push('/login');
    }
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
      <div className="min-h-screen bg-[#F4F7FB] p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-800">
          {error || 'Could not load your profile.'}
        </div>
      </div>
    );
  }

  const kycVerified = kyc?.kycStatus === 'VERIFIED';
  const maxLimit = eligibility?.credit_limit?.max_limit ? Number(eligibility.credit_limit.max_limit) : 0;
  const availableLimit = eligibility?.credit_limit?.available_limit ? Number(eligibility.credit_limit.available_limit) : 0;
  
  const creditScore = eligibility?.credit_limit?.credit_score ?? 50;
  const scoreBand = eligibility?.credit_limit?.score_band ?? 'C';

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
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          
          {/* Centered content layout matching dashboard patterns */}
          <div className="mx-auto max-w-3xl">
            
            {/* ============ PROFILE HEADER ============ */}
            <div className="relative overflow-hidden rounded-2xl bg-[#0a5cbe] px-6 py-6 text-white shadow-sm mb-6">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-xl font-bold text-white ring-2 ring-white/20">
                    {derived.initials}
                  </div>
                  {kycVerified && (
                    <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-[#0a5cbe] bg-emerald-500 text-white">
                      <svg viewBox="0 0 10 10" className="h-3 w-3">
                        <path d="M1.5 5l2 2 5-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-[22px] font-bold uppercase tracking-tight text-white">
                    {derived.displayName}
                  </h1>
                  <p className="mt-1 truncate text-[13px] font-medium text-white/80">
                    {borrower.phone || borrower.email}
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-emerald-500" />
            </div>

            {/* ============ KYC CARD ============ */}
            <div className="mb-6">
              {kyc ? (
                <KycCard kyc={kyc} onAction={() => router.push('/kyc')} />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white px-5 py-5 text-[13px] text-gray-500">
                  KYC status unavailable. Pull to refresh.
                </div>
              )}
            </div>

            {/* ============ CREDIT SCORE CARD ============ */}
            {eligibility?.credit_limit && (
              <div className="mb-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-[#0a5cbe]" />
                      <h2 className="text-[14px] font-bold text-gray-900 tracking-tight">Credit Score</h2>
                    </div>
                    <span className="text-[14px] font-black text-[#0a5cbe]">
                      {creditScore}/100
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#10B981] rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${creditScore}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-[11px] font-medium text-gray-500">
                      Your score determines your borrowing limit.
                    </p>
                    <span className="text-[10px] font-bold px-2 py-1 bg-[#EEF3FA] text-[#0a5cbe] rounded-md">
                      Band {scoreBand}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ============ ACCOUNT SUMMARY ============ */}
            <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <SectionHeader title="Account" />
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                <StatTile label="Limit" value={maxLimit > 0 ? `KES ${maxLimit.toLocaleString()}` : 'KES 0'} />
                <StatTile label="Available" value={availableLimit > 0 ? `KES ${availableLimit.toLocaleString()}` : 'KES 0'} />
                <StatTile label="Member" value={derived.memberSince.split(' ')[1] || '—'} sub={derived.memberSince.split(' ')[0]} />
              </div>
            </section>

            {/* ============ SETTINGS ============ */}
            <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <SectionHeader title="Settings" />
              <SettingsRow icon={<Bell size={17} strokeWidth={2.2} />} label="Notifications" hint="Push and SMS preferences" />
              <SettingsRow icon={<Lock size={17} strokeWidth={2.2} />} label="Security & PIN" hint="Manage your login PIN" />
              <SettingsRow icon={<WalletCards size={17} strokeWidth={2.2} />} label="Disbursement account" hint={borrower.phone || 'Not set'} />
            </section>

            {/* ============ SUPPORT ============ */}
            <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <SectionHeader title="Support" />
              <SettingsRow icon={<HelpCircle size={17} strokeWidth={2.2} />} label="Help centre" />
              <SettingsRow icon={<FileText size={17} strokeWidth={2.2} />} label="Terms & conditions" onClick={() => router.push('/terms')} />
              <SettingsRow icon={<Shield size={17} strokeWidth={2.2} />} label="Privacy policy" />
              <SettingsRow icon={<Info size={17} strokeWidth={2.2} />} label="About IMARA CREDIT" hint="Version 0.1.0" />
            </section>

            {/* ============ FOOTER ============ */}
            <div className="px-8 pb-8 pt-2 text-center">
              <p className="text-[10px] font-medium tracking-wide text-gray-400">
                IMARA CREDIT · v0.1.0
              </p>
            </div>

          </div>
        </main>
      </div>

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
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