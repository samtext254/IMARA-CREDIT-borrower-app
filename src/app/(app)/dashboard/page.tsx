'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- Import Portal
import Link from 'next/link';
import { 
  Menu, Search, Home, Shield, Compass, FileText, 
  HelpCircle, LogOut, ShoppingBag, CreditCard, Calendar, 
  Download, Wallet, MoreVertical, X
} from 'lucide-react';

export default function BritamDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // <--- Required for Portal

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = {
    name: 'SAMUEL',
    initials: 'SC',
    product: 'Britam Money Market Fund',
    accountNo: 'BA100024799WP'
  };

  const quickActions = [
    { icon: ShoppingBag, label: 'Buy Now' },
    { icon: CreditCard, label: 'Pay Now' },
    { icon: Calendar, label: 'Recurring ...' },
    { icon: Download, label: 'Top Up' },
    { icon: Wallet, label: 'Withdraw' },
  ];

  const sidebarNav = [
    { icon: Home, label: 'Dashboard', active: true, href: '/dashboard' }, 
    { icon: Shield, label: 'Products', href: '/products' },
    { icon: Compass, label: 'Discover', href: '/discover' },
    { icon: FileText, label: 'Activity', href: '/activity' },
    { icon: HelpCircle, label: 'Help', href: '/help' },
  ];

  // We wait until the browser loads before rendering the portal
  if (!mounted) return null;

  // We use createPortal to render the dashboard directly into the <body> tag,
  // bypassing the (app) layout entirely!
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex h-screen w-full bg-[#F4F6F8] font-sans text-slate-800 overflow-hidden">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 flex-col bg-[#0077C8] text-white md:flex shrink-0">
        <div className="flex h-24 items-center px-8">
          <Link href="/dashboard" className="leading-tight">
            <h1 className="text-3xl font-bold tracking-tight text-white">Britam</h1>
            <p className="text-[10px] font-medium text-white/80">With you every step of the way</p>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {sidebarNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium transition-colors ${
                item.active 
                  ? 'bg-white/15 text-white' 
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={20} className={item.active ? 'text-white' : 'text-white/70'} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6">
          <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8] shadow-sm transition hover:bg-slate-50">
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
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu size={24} />
            </button>
            
            <div className="hidden md:flex w-96 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            
            <h1 className="text-lg font-bold text-slate-900 md:hidden">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-slate-600 md:hidden">
              <Search size={22} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8A65] text-sm font-bold text-white ring-2 ring-white">
              {user.initials}
            </button>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          {/* HERO BANNER */}
          <div className="relative mb-6 h-48 w-full overflow-hidden rounded-xl sm:h-64">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=2000&auto=format&fit=crop')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            
            <div className="relative flex h-full flex-col justify-center px-6 sm:px-10 text-white">
              <h2 className="text-3xl font-bold sm:text-4xl text-white">Hi, {user.name}</h2>
              <p className="mt-2 text-sm font-medium sm:text-base text-white/90">Welcome to your dashboard</p>
            </div>
          </div>

          {/* GRID LAYOUT */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* QUICK ACTIONS */}
            <div className="order-1 lg:order-2 flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">Show More</button>
              </div>
              
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                {quickActions.map((action) => (
                  <button key={action.label} className="flex flex-col items-center gap-3 group">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0077C8] text-white shadow-sm transition-transform group-hover:scale-105 group-active:scale-95">
                      <action.icon size={24} />
                    </div>
                    <span className="text-center text-[11px] font-semibold text-slate-600 leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* MY PRODUCTS */}
            <div className="order-2 lg:order-1 flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">My Products</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">View All</button>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-green-100">
                    <svg className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{user.product}</p>
                    <p className="text-xs text-slate-500">Account No: {user.accountNo}</p>
                  </div>
                </div>
                <button className="rounded p-2 text-slate-400 hover:bg-slate-50">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

          </div>

          {/* BOTTOM SECTIONS */}
          <div className="mt-8 flex flex-col gap-8">
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Discover Britam Offers</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">Explore More</button>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                <p className="text-sm text-slate-500">No deals found</p>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Explore Britam Products</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">View All</button>
              </div>
            </section>
          </div>

          {/* FOOTER */}
          <footer className="mt-12 flex flex-col items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row pb-8">
            <div className="flex gap-4">
              <Link href="#" className="hover:text-slate-600">Terms of Use</Link>
              <span>|</span>
              <Link href="#" className="hover:text-slate-600">Privacy Policy</Link>
            </div>
            <p className="mt-4 sm:mt-0">© 2026 Britam Holdings PLC</p>
          </footer>
        </main>
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100000] md:hidden">
          <button 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[#0077C8] text-white shadow-2xl transition-transform">
            <div className="flex h-20 items-center justify-between px-6">
              <Link href="/dashboard" className="leading-tight">
                <h1 className="text-2xl font-bold tracking-tight text-white">Britam</h1>
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-4 mt-4">
              {sidebarNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium transition-colors ${
                    item.active 
                      ? 'bg-white/15 text-white' 
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="p-6">
              <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8]">
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

    </div>,
    document.body // <--- Renders directly to the body
  );
}