'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Banknote, Home as HomeIcon, Car, Briefcase, Coins, GraduationCap,
  WalletCards, Receipt, Smartphone, PiggyBank, Shield, ArrowLeftRight, HelpCircle, Leaf,
  Search, Bell, ChevronDown, ChevronLeft, ChevronRight, User, LogOut, Lock
} from 'lucide-react';
import { loans as loansApi } from '@/lib/loans';
import type { LoanProduct, Loan, Eligibility } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';
import { imara } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Static Nav Data                                                    */
/* ------------------------------------------------------------------ */
const NAV = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/loans', label: 'Loans', icon: WalletCards },
  { href: '/payments', label: 'Payments', icon: Receipt },
  { href: '/m-pesa', label: 'M-PESA Services', icon: Smartphone },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
  { href: '/credit-score', label: 'Credit Score', icon: Shield },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/products', label: 'Products', icon: Briefcase },
  { href: '/support', label: 'Support', icon: HelpCircle },
];

/* ------------------------------------------------------------------ */
/*  Reusable Components                                                */
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

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */
export default function LoanProductsPage() {
  const router = useRouter();
  const pathname = usePathname() || '/products';

  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout States
  const [collapsed, setCollapsed] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState('User');
  const [initials, setInitials] = useState('SC');
  
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [prodRes, eligRes, loansRes, kycRes, meRes] = await Promise.allSettled([
          loansApi.getProducts(),
          loansApi.getEligibility(),
          loansApi.getLoans({ limit: 5 }),
          getKycStatus(),
          imara.me(),
        ]);

        if (cancelled) return;

        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
        if (eligRes.status === 'fulfilled') setEligibility(eligRes.value.data);
        
        if (loansRes.status === 'fulfilled') {
          const list = loansRes.value.data || [];
          const active = list.find((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
          setActiveLoan(active || null);
        }

        if (kycRes.status === 'fulfilled') setKycData(kycRes.value);

        if (meRes.status === 'fulfilled') {
          const b = meRes.value.data;
          const name = [b.first_name, b.last_name].filter(Boolean).join(' ').trim() || b.email.split('@')[0];
          setBorrowerName(name);
          setInitials(name.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase());
        }

      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
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
    try { await imara.logout(); } catch {}
    finally { router.push('/login'); }
  }

  function handleApplyClick(product: LoanProduct) {
    if (activeLoan) {
      alert(`You already have an active loan (${activeLoan.loan_reference}). Please repay it before applying for a new one.`);
      return;
    }

    if (kycData?.kycStatus !== 'VERIFIED') {
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a5cbe] border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading products...</p>
      </div>
    );
  }

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
        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          <div className="mx-auto max-w-[1000px]">
            
            {/* HEADER */}
            <div className="mb-6 flex items-center gap-4">
              <button onClick={() => router.back()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-50">
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Explore</p>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">Loan Products</h1>
              </div>
            </div>

            {error ? (
              <div className="p-6 text-center text-red-600 rounded-2xl bg-white border border-red-100">{error}</div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center text-slate-500 rounded-2xl bg-white border border-slate-100">No products available at the moment.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => {
                  let Icon = Banknote;
                  const nameUpper = p.name.toUpperCase();
                  if (nameUpper.includes('HOME')) Icon = HomeIcon;
                  if (nameUpper.includes('CAR')) Icon = Car;
                  if (nameUpper.includes('BUSINESS')) Icon = Briefcase;
                  if (nameUpper.includes('MICRO')) Icon = Coins;
                  if (nameUpper.includes('EDUCATION')) Icon = GraduationCap;

                  return (
                    <div key={p.id} className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_12px_rgba(15,41,77,0.05)] transition hover:shadow-md">
                      <div>
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EEF3FA] text-[#0a5cbe]">
                          <Icon size={24} strokeWidth={2} />
                        </div>
                        <h3 className="text-[16px] font-bold text-slate-900 leading-tight mb-1">{p.name}</h3>
                        <p className="text-[12px] text-slate-500 line-clamp-2 mb-4">
                          {p.description || 'Flexible financing to meet your needs.'}
                        </p>
                      </div>

                      <div>
                        <div className="space-y-2 border-t border-slate-100 pt-4 mb-4">
                          <div className="flex justify-between text-[12px]">
                            <span className="text-slate-500">Max Loan</span>
                            <span className="font-bold text-slate-900">KES {Number(p.max_amount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[12px]">
                            <span className="text-slate-500">Term</span>
                            <span className="font-bold text-slate-900">{p.min_term_days} - {p.max_term_days} days</span>
                          </div>
                          <div className="flex justify-between text-[12px]">
                            <span className="text-slate-500">Interest</span>
                            <span className="font-bold text-slate-900">{p.interest_rate}%</span>
                          </div>
                        </div>

                        <button onClick={() => handleApplyClick(p)} className="w-full rounded-xl bg-[#0a5cbe] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#084a99]">
                          Apply Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {[
            { href: '/dashboard', label: 'Home', icon: HomeIcon },
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