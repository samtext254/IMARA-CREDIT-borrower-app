'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Home, WalletCards, Receipt, Smartphone,
  PiggyBank, Shield, ArrowLeftRight, Briefcase, HelpCircle, Leaf, Lock,
  FileText, X, LogOut
} from 'lucide-react';

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

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean) => void;
  onLogout: () => void;
  loggingOut: boolean;
}

export default function Sidebar({ collapsed, setCollapsed, isSidebarOpen, setIsSidebarOpen, onLogout, loggingOut }: SidebarProps) {
  const pathname = usePathname() || '/dashboard';

  return (
    <>
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside
        className={`relative hidden shrink-0 flex-col bg-[#0b2a57] text-white transition-[width] duration-300 lg:flex ${
          collapsed ? 'w-[84px]' : 'w-[268px]'
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
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

      {/* ==================== MOBILE "MORE" DRAWER ==================== */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-[#0b2a57] text-white shadow-2xl">
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
    </>
  );
}