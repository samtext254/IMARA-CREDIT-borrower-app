'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Menu, Search, Home, Shield, Compass, FileText, 
  HelpCircle, LogOut, ShoppingBag, CreditCard, Calendar, 
  Download, Wallet, MoreVertical, X, ArrowRight, Clock
} from 'lucide-react';

// -- Mock Data (Replace these with your actual API data hooks) --
const user = {
  name: 'SAMUEL',
  initials: 'SC',
  product: 'Britam Money Market Fund',
  accountNo: 'BA100024799WP'
};

const loanData = {
  hasActiveLoan: true,
  outstandingBalance: 8500,
  principalAmount: 20000,
  progress: 70,
  nextPayment: 2500,
  dueDate: '15 Oct 2026'
};

const creditProfile = {
  score: 750,
  status: 'Excellent', // Poor, Fair, Good, Excellent
  availableLimit: 20000
};

export default function BritamDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper for Credit Score Badge
  const getScoreColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-700';
      case 'Good': return 'bg-blue-100 text-blue-700';
      case 'Fair': return 'bg-yellow-100 text-yellow-700';
      case 'Poor': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const sidebarNav = [
    { icon: Home, label: 'Dashboard', active: true, href: '/dashboard' }, 
    { icon: Shield, label: 'Products', href: '/products' },
    { icon: Compass, label: 'Discover', href: '/discover' },
    { icon: FileText, label: 'Activity', href: '/activity' },
    { icon: HelpCircle, label: 'Help', href: '/help' },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F6F8] font-sans text-slate-800">
      
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
                item.active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
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
            <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu size={24} />
            </button>
            <div className="hidden md:flex w-96 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="Search anything..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 md:hidden">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8A65] text-sm font-bold text-white ring-2 ring-white">
              {user.initials}
            </button>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-24 md:pb-8">
          
          {/* WELCOME TEXT (No more big image) */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Hi, {user.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Welcome back to your dashboard.</p>
          </div>

          {/* TWO MAIN CARDS */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* CARD 1: ACTIVE LOAN */}
            <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</p>
                  <h3 className="mt-1 text-3xl font-extrabold text-slate-900">
                    KES {loanData.outstandingBalance.toLocaleString()}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    of KES {loanData.principalAmount.toLocaleString()} principal
                  </p>
                </div>
                
                {/* Progress Ring (CSS SVG) */}
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-[#0077C8]" strokeDasharray={`${loanData.progress}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span className="absolute text-sm font-bold text-slate-700">{loanData.progress}%</span>
                </div>
              </div>

              <div className="my-5 h-px w-full bg-slate-100" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Payment</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">KES {loanData.nextPayment.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Due Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 flex items-center gap-1">
                    <Clock size={14} className="text-slate-400" /> {loanData.dueDate}
                  </p>
                </div>
              </div>

              <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0077C8] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0060a3]">
                Repay Now <ArrowRight size={16} />
              </button>
            </div>

            {/* CARD 2: CREDIT PROFILE */}
            <div className="flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Credit Profile</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0077C8]">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-900">{creditProfile.score}</h3>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getScoreColor(creditProfile.status)}`}>
                      {creditProfile.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="my-5 h-px w-full bg-slate-100" />

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Loan Limit</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">KES {creditProfile.availableLimit.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-500">Based on your current credit score.</p>
              </div>

              <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[#0077C8] bg-white px-4 py-3 text-sm font-bold text-[#0077C8] transition hover:bg-blue-50">
                Apply for a Loan
              </button>
            </div>

          </div>

          {/* QUICK ACTIONS & RECENT ACTIVITY GRID */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
             
             {/* Quick Actions */}
             <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: ShoppingBag, label: 'Buy Now' },
                  { icon: CreditCard, label: 'Pay Now' },
                  { icon: Calendar, label: 'Recurring' },
                  { icon: Download, label: 'Top Up' },
                ].map((action) => (
                  <button key={action.label} className="flex flex-col items-center gap-2 group">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0077C8] text-white shadow-sm transition-transform group-hover:scale-105 group-active:scale-95">
                      <action.icon size={20} />
                    </div>
                    <span className="text-center text-[11px] font-semibold text-slate-600">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* My Products (List View) */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">My Products</h3>
                <button className="text-sm font-semibold text-[#0077C8] hover:underline">View All</button>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-4">
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

        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white px-2 py-3 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[#0077C8]">
          <Home size={22} />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/apply" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Compass size={22} />
          <span className="text-[10px] font-medium">Apply</span>
        </Link>
        <Link href="/loans" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <FileText size={22} />
          <span className="text-[10px] font-medium">Loans</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <HelpCircle size={22} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
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
                <Link key={item.label} href={item.href} className={`flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium transition-colors ${item.active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                  <item.icon size={20} /> {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-6">
              <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8]">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

    </div>
  );
}