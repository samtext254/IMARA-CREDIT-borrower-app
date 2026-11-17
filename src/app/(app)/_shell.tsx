'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, HelpCircle, LogOut, User,
  WalletCards, Receipt, Smartphone, PiggyBank, Home, Shield, ArrowLeftRight,
  Briefcase, Leaf, Search, X, Lock, FileText, Landmark
} from 'lucide-react';
import { BottomNav } from '@/components/borrower/BottomNav';
import { DownloadAppButton } from '@/components/pwa/DownloadAppButton';
import { imara, ImaraApiError } from '@/lib/api';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';
import KycModal from '@/components/KycModal';

type NavItem = {
  label: string;
  icon: any;
  href?: string;
  dropdown?: { href: string; label: string }[];
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Home', icon: Home },
      { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { href: '/statements', label: 'Statements', icon: FileText },
    ]
  },
  {
    title: 'Money Transfer',
    items: [
      { 
        label: 'Mobile Money', 
        icon: Smartphone,
        dropdown: [
          { href: '/m-pesa', label: 'M-PESA' },
          { href: '/airtel-money', label: 'Airtel Money' },
        ]
      },
      { 
        label: 'Bank Transfer', 
        icon: Landmark,
        dropdown: [
          { href: '/bank/equity', label: 'Equity Bank' },
          { href: '/bank/kcb', label: 'KCB Bank' },
          { href: '/bank/family', label: 'Family Bank' },
        ]
      },
    ]
  },
  {
    title: 'Credit & Growth',
    items: [
      { 
        label: 'Loans', 
        icon: WalletCards,
        dropdown: [
          { href: '/apply/loan', label: 'Apply Loan' },
          { href: '/loans/repay', label: 'Repay Loan' },
          { href: '/loans', label: 'My Loans' },
          { href: '/loans/statement', label: 'Loan Statement' },
        ]
      },
      { 
        label: 'Savings', 
        icon: PiggyBank,
        dropdown: [
          { href: '/savings/open', label: 'Open Savings Acc' },
          { href: '/savings', label: 'My Savings' },
        ]
      },
      { href: '/credit-score', label: 'Credit Score', icon: Shield },
      { href: '/products', label: 'Products', icon: Briefcase },
    ]
  },
  {
    title: 'Support',
    items: [
      { href: '/support', label: 'Help & Support', icon: HelpCircle },
    ]
  }
];

const KYC_DISMISS_PREFIX = 'kyc-dismissed';

function kycDismissKey(data: KycStatusResponse | null): string {
  if (!data) return KYC_DISMISS_PREFIX + '-unknown';
  return `${KYC_DISMISS_PREFIX}-${data.kycStatus}-${data.submittedAt || 'na'}`;
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
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className="space-y-6 pb-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <h3 className="mb-2 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
              {group.title}
            </h3>
          )}
          
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const hasDropdown = item.dropdown && item.dropdown.length > 0;
              const isDropdownOpen = openDropdowns[item.label];
              
              if (!hasDropdown && item.href) {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center rounded-xl text-[14px] font-medium transition-all duration-200 ${
                      collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-2.5'
                    } ${
                      active 
                        ? 'bg-gradient-to-r from-[#1565d8] to-[#0f4fb0] text-white shadow-md shadow-blue-900/20' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2.2 : 1.7} className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200 transition-colors'} />
                    {!collapsed && <span>{item.label}</span>}
                    
                    {collapsed && active && (
                      <span className="absolute left-0 h-6 w-1 rounded-r-full bg-emerald-400" />
                    )}
                  </Link>
                );
              }

              const isGroupActive = item.dropdown?.some(sub => pathname.startsWith(sub.href));
              
              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown(item.label)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full group flex items-center justify-between rounded-xl text-[14px] font-medium transition-all duration-200 ${
                      collapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5'
                    } ${
                      isDropdownOpen || isGroupActive
                        ? 'text-white' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                      <Icon size={20} strokeWidth={1.7} className={isGroupActive ? 'text-white' : 'text-slate-400'} />
                      {!collapsed && <span>{item.label}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>

                  {!collapsed && isDropdownOpen && item.dropdown && (
                    <div className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-3">
                      {item.dropdown.map((subItem) => {
                        const subActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={onNavigate}
                            className={`block rounded-lg px-3 py-2 text-[13px] transition-colors ${
                              subActive 
                                ? 'bg-white/10 font-semibold text-white' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';
  
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [borrower, setBorrower] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [meRes, kycRes] = await Promise.allSettled([imara.me(), getKycStatus()]);
        if (cancelled) return;

        if (meRes.status === 'fulfilled') {
          setBorrower(meRes.value.data);
          setAuthed(true);
        }

        if (kycRes.status === 'fulfilled') {
          const kyc = kycRes.value;
          setKycData(kyc);
          if (kyc.kycStatus !== 'VERIFIED') {
            let dismissed = false;
            try { dismissed = window.sessionStorage.getItem(kycDismissKey(kyc)) === '1'; } catch {}
            if (!dismissed) setTimeout(() => { if (!cancelled) setShowKycModal(true); }, 400);
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ImaraApiError) {
          // SessionWatcher handles redirect
        }
      } finally {
        if (!cancelled) setChecking(false);
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

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-page">
        <main className="flex-1 pb-20 px-3 pt-3">
          <div className="h-44 animate-pulse rounded-3xl bg-ink-100/40" />
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-ink-100/40" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!authed || !borrower) {
    return (
      <div className="min-h-screen flex flex-col max-w-md mx-auto bg-page">
        <main className="flex-1 pb-20" />
        <BottomNav />
      </div>
    );
  }

  const fullName = [borrower.first_name, borrower.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || borrower.email.split('@')[0];
  const initials = displayName.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const profileMenu = isProfileOpen && (
    <div className="absolute right-0 top-full z-50 mt-3 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
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
    <div className="fixed inset-0 z-[100] flex overflow-hidden bg-[#F0F4F8] font-sans text-slate-800">
      
      <aside className={`relative hidden shrink-0 flex-col bg-[#0b2a57] text-white transition-[width] duration-300 lg:flex ${collapsed ? 'w-[88px]' : 'w-[280px]'}`}>
        <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="absolute -right-3 top-8 z-20 grid h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-[#0f2f66] shadow-md transition hover:bg-slate-50">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        
        <div className={`flex h-[72px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
          <Logo dark compact={collapsed} />
        </div>
        
        <nav className={`flex-1 overflow-y-auto py-6 no-scrollbar ${collapsed ? 'px-3' : 'px-4'}`}>
          <NavLinks pathname={pathname} collapsed={collapsed} />
        </nav>
        
        <div className="mt-auto border-t border-white/10 p-4">
          <div className={`flex flex-col gap-1 ${collapsed ? 'items-center' : 'items-start px-2'}`}>
            <span className="text-[11px] font-medium text-slate-400">
              {collapsed ? 'v2.0' : 'Version 2.0.0'}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              {!collapsed && <Lock size={10} />}
              {!collapsed && 'Secure & Trusted'}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        
        <header className="hidden h-[72px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
          <div className="flex w-full max-w-[540px] items-center gap-3 rounded-full border border-slate-200 bg-[#F8FAFC] px-5 py-3">
            <Search size={17} className="text-slate-500" />
            <input type="text" placeholder="Search services, transactions, loans..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-[#0f2f66] transition hover:bg-slate-50" aria-label="Notifications">
              <Bell size={21} /><span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div ref={profileRef} className="relative flex cursor-pointer items-center gap-3" onClick={() => setIsProfileOpen((v) => !v)}>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0a5cbe] text-sm font-bold text-white">{initials}</div>
              <p className="text-[13px] font-bold uppercase text-slate-900">{displayName}</p>
              <ChevronDown size={15} className="text-slate-500" />{profileMenu}
            </div>
          </div>
        </header>

        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 pb-3 pt-4 lg:hidden">
          <Logo />
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative grid h-9 w-9 place-items-center text-[#0f2f66]" aria-label="Notifications">
              <Bell size={21} /><span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div ref={profileMobileRef} className="relative">
              <button type="button" onClick={() => setIsProfileOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0a5cbe] text-xs font-bold text-white">{initials}</button>
              {profileMenu}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
          {children}
        </main>
      </div>

      <BottomNav onMoreClick={() => setIsSidebarOpen(true)} />
      
      <DownloadAppButton />

      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-[#0b2a57] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 pb-2 pt-6">
              <Logo dark />
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white" aria-label="Close menu"><X size={22} /></button>
            </div>
            <nav className="mt-6 flex-1 overflow-y-auto px-4 no-scrollbar">
              <NavLinks pathname={pathname} onNavigate={() => setIsSidebarOpen(false)} />
              <Link href="/terms" onClick={() => setIsSidebarOpen(false)} className="mt-4 flex items-center gap-4 rounded-xl px-5 py-3.5 text-[15px] font-medium text-slate-200 hover:bg-white/5">
                <FileText size={21} strokeWidth={1.7} className="text-slate-200" /> Terms &amp; Conditions
              </Link>
            </nav>
            <div className="border-t border-white/10 p-5">
              <div className="mb-4 flex flex-col items-center">
                <span className="text-[11px] font-medium text-slate-400">Version 2.0.0</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500"><Lock size={10} /> Secure & Trusted</span>
              </div>
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