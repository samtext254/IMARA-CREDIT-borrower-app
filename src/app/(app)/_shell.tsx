'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell, ChevronDown, HelpCircle, LogOut, User,
  WalletCards, Receipt, PiggyBank, Home, ShieldCheck, ShieldAlert, ArrowLeftRight,
  Search, X, Leaf, Wallet, Settings
} from 'lucide-react';
import { BottomNav } from '@/components/borrower/BottomNav';
import { DownloadAppButton } from '@/components/pwa/DownloadAppButton';
import { imara, ImaraApiError } from '@/lib/api';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';
import KycModal from '@/components/KycModal';

type NavItem = {
  label: string;
  icon: any;
  href: string;
  /** Extra route prefixes that keep this item highlighted (sub-pages live inside the page as tabs). */
  match?: string[];
  badge?: string | number;
};

const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  {
    items: [{ href: '/dashboard', label: 'Home', icon: Home }],
  },
  {
    title: 'Money',
    items: [
      { href: '/wallet', label: 'Wallet', icon: Wallet, badge: 'New', match: ['/m-pesa', '/airtel-money', '/bank'] },
      { href: '/payments', label: 'Pay bills', icon: Receipt, badge: 'New' },
    ],
  },
  {
    title: 'Borrow',
    items: [
      // TODO: replace the static 2 with the real count of loans due.
      { href: '/loans', label: 'Loans', icon: WalletCards, badge: 2, match: ['/apply', '/credit-score'] },
    ],
  },
  {
    title: 'Grow',
    items: [{ href: '/savings', label: 'Save & invest', icon: PiggyBank }],
  },
  {
    title: 'Activity',
    items: [{ href: '/transactions', label: 'Transactions', icon: ArrowLeftRight, match: ['/statements'] }],
  },
  {
    title: 'Help',
    items: [
      { href: '/support', label: 'Support', icon: HelpCircle },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const KYC_DISMISS_PREFIX = 'kyc-dismissed';

function kycDismissKey(data: KycStatusResponse | null): string {
  if (!data) return KYC_DISMISS_PREFIX + '-unknown';
  return `${KYC_DISMISS_PREFIX}-${data.kycStatus}-${data.submittedAt || 'na'}`;
}

function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400 text-[#0b2a57]">
        <Leaf size={20} strokeWidth={2.2} />
      </span>
      {!compact && (
        <p className={`text-[20px] leading-tight tracking-tight ${dark ? 'text-white' : 'text-[#0f2f66]'}`}>
          <span className="font-semibold">Imara</span> <span className="font-medium">Credit</span>
        </p>
      )}
    </div>
  );
}

function isActivePath(pathname: string, item: NavItem) {
  return [item.href, ...(item.match || [])].some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function NavLinks({ pathname, onNavigate, collapsed = false }: { pathname: string; onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <div>
      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.title || 'top'} className={groupIndex === 0 ? 'pt-3' : collapsed ? 'mt-3 border-t border-white/10 pt-3' : 'mt-6'}>
          {group.title && !collapsed && (
            <h3 className="mb-1.5 px-3 text-xs font-semibold text-slate-400">{group.title}</h3>
          )}

          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item);
              const isCount = typeof item.badge === 'number';

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center rounded-xl text-[14px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    collapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'
                  } ${
                    active
                      ? 'bg-emerald-400/15 font-semibold text-white'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-400" />}
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.2 : 1.7}
                    className={active ? 'text-emerald-400' : 'text-slate-400 transition-colors group-hover:text-slate-200'}
                  />
                  {!collapsed && <span>{item.label}</span>}

                  {item.badge !== undefined && !collapsed && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isCount ? 'bg-red-500 text-white' : 'bg-emerald-400/20 text-emerald-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.badge !== undefined && collapsed && (
                    <span className={`absolute right-3 top-2 h-2 w-2 rounded-full ${isCount ? 'bg-red-500' : 'bg-emerald-400'}`} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarFooter({ kyc, collapsed, onVerify }: { kyc: KycStatusResponse | null; collapsed: boolean; onVerify: () => void }) {
  if (!kyc) return null;
  const verified = kyc.kycStatus === 'VERIFIED';

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={verified ? undefined : onVerify}
        title={verified ? 'Account verified' : 'Complete verification'}
        className="relative mx-auto grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        {verified ? <ShieldCheck size={20} className="text-emerald-400" /> : <ShieldAlert size={20} className="text-amber-400" />}
        {!verified && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />}
      </button>
    );
  }

  if (verified) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 text-[13px] font-medium text-slate-300">
        <ShieldCheck size={18} className="text-emerald-400" /> Account verified
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
        <ShieldAlert size={18} className="text-amber-400" /> Verify your account
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-slate-300">Finish verification to unlock loans and a higher limit.</p>
      <button
        type="button"
        onClick={onVerify}
        className="mt-3 w-full rounded-lg bg-emerald-400 py-2 text-[13px] font-bold text-[#0b2a57] transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        Complete verification
      </button>
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
      <button type="button" onClick={() => router.push('/settings')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50">
        <Settings size={16} className="text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">Settings</span>
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

      <aside className="hidden w-[280px] shrink-0 flex-col bg-[#0b2a57] text-white lg:flex">
        <div className="flex h-[72px] items-center border-b border-white/10 px-5">
          <Logo dark />
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="border-t border-white/10 p-4">
          <SidebarFooter kyc={kycData} collapsed={false} onVerify={() => setShowKycModal(true)} />
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
            <div className="flex items-center justify-between border-b border-white/10 px-5 pb-3 pt-6">
              <Logo dark />
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white" aria-label="Close menu"><X size={22} /></button>
            </div>
            <nav aria-label="Main" className="flex-1 overflow-y-auto px-4 no-scrollbar">
              <NavLinks pathname={pathname} onNavigate={() => setIsSidebarOpen(false)} />
            </nav>
            <div className="space-y-3 border-t border-white/10 p-5">
              <SidebarFooter
                kyc={kycData}
                collapsed={false}
                onVerify={() => { setIsSidebarOpen(false); setShowKycModal(true); }}
              />
              <button onClick={onLogout} disabled={loggingOut} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0f294d] disabled:opacity-60">
                <LogOut size={18} /> {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </aside>
        </div>
      )}

      <KycModal open={showKycModal} onClose={dismissKycModal} data={kycData} />
    </div>
  );
}