'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, Home, Shield, Compass, FileText, HelpCircle, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function ApplyDonePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F6F8] font-sans text-slate-800">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 flex-col bg-[#0077C8] text-white md:flex shrink-0">
        <div className="flex h-24 items-center px-8">
          <Link href="/dashboard" className="leading-tight">
            <h1 className="text-3xl font-bold tracking-tight text-white">Imara</h1>
            <p className="text-[10px] font-medium text-white/80">With you every step of the way</p>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          <Link href="/dashboard" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Home size={20} className="text-white/70" /> Dashboard
          </Link>
          <Link href="/products" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Shield size={20} className="text-white/70" /> Products
          </Link>
          <Link href="/discover" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Compass size={20} className="text-white/70" /> Discover
          </Link>
          <Link href="/activity" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <FileText size={20} className="text-white/70" /> Activity
          </Link>
          <Link href="/help" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <HelpCircle size={20} className="text-white/70" /> Help
          </Link>
        </nav>
        <div className="p-6">
          <button onClick={() => router.push('/login')} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8] shadow-sm transition hover:bg-slate-50">
            <LogOut size={18} /> Logout
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
            <h1 className="text-lg font-bold text-slate-900 md:hidden">Success</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8A65] text-sm font-bold text-white ring-2 ring-white">
              SC
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
            
            <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200/50">
              
              {/* HEADER BANNER */}
              <div className="relative bg-[#0A1E3F] px-8 py-12 text-center">
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#0077C8]/40 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-[#0077C8]/40 blur-3xl" />
                
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-400 ring-1 ring-green-500/30 backdrop-blur-sm">
                  <CheckCircle2 size={40} strokeWidth={2.2} />
                </div>
                <h1 className="relative text-3xl font-extrabold tracking-tight text-white">
                  Application received
                </h1>
                <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">
                  Your loan application is now under review. We will notify you as soon as your lender approves it.
                </p>
              </div>

              {/* BODY */}
              <div className="p-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                      <Clock3 size={24} strokeWidth={2.2} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</p>
                      <p className="mt-0.5 text-base font-bold text-slate-900">Pending approval</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    You can track your loan from the Loans tab. You will also receive an email and SMS when the decision is made.
                  </p>
                </div>

                <div className="mt-8 space-y-3">
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0077C8] px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0060a3]"
                  >
                    Back to Dashboard
                  </Link>
                  <Link
                    href="/loans"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    View my loans
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white px-2 py-3 md:hidden">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Home size={22} /><span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/apply" className="flex flex-col items-center gap-1 text-[#0077C8]">
          <Compass size={22} /><span className="text-[10px] font-bold">Apply</span>
        </Link>
        <Link href="/loans" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <FileText size={22} /><span className="text-[10px] font-medium">Loans</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <HelpCircle size={22} /><span className="text-[10px] font-medium">Profile</span>
        </Link>
      </nav>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[#0077C8] text-white shadow-2xl transition-transform">
            <div className="flex h-20 items-center justify-between px-6">
              <Link href="/dashboard" className="leading-tight">
                <h1 className="text-2xl font-bold tracking-tight text-white">Imara</h1>
              </Link>
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-4 mt-4">
              <Link href="/dashboard" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80">
                <Home size={20} /> Dashboard
              </Link>
            </nav>
          </aside>
        </div>
      )}

    </div>
  );
}