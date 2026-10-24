'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Menu, Search, User, Home, Shield, Compass, FileText, 
  HelpCircle, LogOut, ShoppingBag, CreditCard, Calendar, 
  Download, Wallet, MoreVertical, ChevronRight 
} from 'lucide-react';

export default function BritamDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Hardcoded user data based on your screenshot
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
    { icon: Home, label: 'Dashboard', active: true },
    { icon: Shield, label: 'Products' },
    { icon: Compass, label: 'Discover' },
    { icon: FileText, label: 'Activity' },
    { icon: HelpCircle, label: 'Help' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8] font-sans text-slate-800">
      
      {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
      <aside className="hidden w-64 flex-col bg-[#0077C8] text-white md:flex">
        {/* Brand Logo */}
        <div className="flex h-24 items-center px-8">
          <div className="leading-tight">
            <h1 className="text-3xl font-bold tracking-tight text-white">Britam</h1>
            <p className="text-[10px] font-medium text-white/80">With you every step of the way</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 px-4">
          {sidebarNav.map((item) => (
            <Link
              key={item.label}
              href="#"
              className={`flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium transition-colors ${
                item.active 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/80 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} className={item.active ? 'text-white' : 'text-white/70'} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-6">
          <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8] shadow-sm transition hover:bg-slate-50">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* TOP NAVBAR (Desktop & Mobile) */}
        <header className="flex h-20 shrink-0 items-center justify-between bg-white px-4 sm:px-8 border-b border-slate-200">
          
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu size={24} />
            </button>
            
            {/* Desktop Search Bar */}
            <div className="hidden md:flex w-96 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            
            {/* Mobile Title (Replaces search on small screens) */}
            <h1 className="text-lg font-bold text-slate-900 md:hidden">Home</h1>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            {/* Mobile Search Icon */}
            <button className="text-slate-600 md:hidden">
              <Search size={22} />
            </button>
            {/* Profile Avatar */}
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFA07A] text-sm font-bold text-white ring-2 ring-white">
              {user.initials}
            </button>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          {/* HERO BANNER */}
          <div className="relative mb-8 h-48 w-full overflow-hidden rounded-xl sm:h-64">
            {/* Background Image overlay (using a placeholder family image) */}
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=2000&auto=format&fit=crop')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            
            <div className="relative flex h-full flex-col justify-center px-8 text-white">
              <h2 className="text-3xl font-bold sm:text-4xl">Hi, {user.name}</h2>
              <p className="mt-2 text-sm font-medium sm:text-base">Welcome to your dashboard</p>
            </div>
          </div>

          {/* DESKTOP GRID (2 Columns) / MOBILE STACK (1 Column) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* LEFT COLUMN: MY PRODUCTS */}
            <div className="order-2 flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50 lg:order-1">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">My Products</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">View All</button>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-green-100/50">
                    {/* Fake chart icon */}
                    <svg className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

            {/* RIGHT COLUMN: QUICK ACTIONS */}
            <div className="order-1 flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50 lg:order-2">
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
                    <span className="text-center text-xs font-medium text-slate-600 leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* BOTTOM SECTIONS (Offers & Products) */}
          <div className="mt-8 grid grid-cols-1 gap-8">
            
            {/* Discover Offers */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Discover Britam Offers</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">Explore More</button>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                <p className="text-sm text-slate-500">No deals found</p>
              </div>
            </section>

            {/* Explore Products */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Explore Britam Products</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">View All</button>
              </div>
            </section>
          </div>

          {/* FOOTER */}
          <footer className="mt-12 flex flex-col items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
            <div className="flex gap-4">
              <Link href="#" className="hover:text-slate-600">Terms of Use</Link>
              <span>|</span>
              <Link href="#" className="hover:text-slate-600">Privacy Policy</Link>
            </div>
            <p className="mt-4 sm:mt-0">© 2026 Britam Holdings PLC</p>
          </footer>
          
        </main>
      </div>
    </div>
  );
}