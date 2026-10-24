'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  CheckCircle2, Receipt, WalletCards, AlertTriangle, 
  Home, Shield, Compass, FileText, HelpCircle, LogOut,
  Menu, Search, X, Inbox, ArrowRight
} from 'lucide-react';
import { loans as loansApi } from '@/lib/loans';
import type { ActivityItem } from '@/lib/loans';

// --- Helpers ---
function formatKes(amount: any): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(n) ? '0' : Math.round(n).toLocaleString('en-KE');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} • ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function activityRow(item: ActivityItem): { title: string; Icon: typeof CheckCircle2; iconClass: string; amountClass: string; } {
  switch (item.kind) {
    case 'repayment_received': return { title: 'Repayment received', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-green-600' };
    case 'loan_submitted': return { title: 'Loan application', Icon: Receipt, iconClass: 'bg-slate-100 text-slate-500', amountClass: 'text-slate-900' };
    case 'loan_approved': return { title: 'Loan approved', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-slate-900' };
    case 'loan_rejected': return { title: 'Loan declined', Icon: Receipt, iconClass: 'bg-red-50 text-red-600', amountClass: 'text-red-600' };
    case 'loan_disbursed': return { title: 'Loan disbursed', Icon: WalletCards, iconClass: 'bg-blue-50 text-blue-600', amountClass: 'text-slate-900' };
    case 'loan_active': return { title: 'Loan active', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-green-600' };
    case 'loan_overdue': return { title: 'Loan overdue', Icon: AlertTriangle, iconClass: 'bg-red-50 text-red-600', amountClass: 'text-red-600' };
    case 'loan_paid': return { title: 'Loan fully repaid', Icon: CheckCircle2, iconClass: 'bg-green-50 text-green-600', amountClass: 'text-green-600' };
    default: return { title: 'Loan update', Icon: Receipt, iconClass: 'bg-slate-100 text-slate-500', amountClass: 'text-slate-900' };
  }
}

export default function ActivityPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ALL transactions on mount
  useEffect(() => {
    async function fetchActivity() {
      try {
        // Request a higher limit to show full history (e.g., 50)
        const res = await loansApi.getActivity({ limit: 50 });
        setActivities(res.data || []);
      } catch (err) {
        setError('Failed to load transactions. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, []);

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
          <Link href="/activity" className="flex items-center gap-4 rounded-lg bg-white/15 px-4 py-3.5 text-sm font-medium text-white transition-colors">
            <FileText size={20} className="text-white" /> Activity
          </Link>
          <Link href="/help" className="flex items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <HelpCircle size={20} className="text-white/70" /> Help
          </Link>
        </nav>

        <div className="p-6">
          <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8] shadow-sm transition hover:bg-slate-50">
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
            <div className="hidden md:flex w-96 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search size={18} className="text-slate-400" />
              <input type="text" placeholder="Search anything..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 md:hidden">Activity</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8A65] text-sm font-bold text-white ring-2 ring-white">
              SC
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">My Activity</h2>
            <p className="mt-1 text-sm text-slate-500">View all your past loan transactions and updates.</p>
          </div>

          <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
            
            {/* List Header (Desktop only) */}
            <div className="hidden border-b border-slate-100 bg-slate-50 px-6 py-3 sm:flex">
              <p className="w-1/2 text-xs font-bold uppercase tracking-wider text-slate-500">Transaction</p>
              <p className="w-1/4 text-xs font-bold uppercase tracking-wider text-slate-500">Date & Time</p>
              <p className="w-1/4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Amount</p>
            </div>

            {/* Loading / Empty State */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0077C8] border-t-transparent" />
              </div>
            ) : error ? (
              <div className="py-16 text-center text-red-500">{error}</div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <Inbox size={40} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Activities found</h3>
                <p className="mt-1 text-sm text-slate-500">Keep exploring and check back later.</p>
                <Link href="/dashboard" className="mt-6 rounded-lg bg-[#0077C8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0060a3]">
                  Explore Dashboard
                </Link>
              </div>
            ) : (
              
              /* THE ACTUAL TRANSACTION LIST */
              <div className="divide-y divide-slate-100">
                {activities.map((item) => {
                  const styled = activityRow(item);
                  return (
                    <div key={`${item.kind}-${item.loan_id}-${item.at}`} className="flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-0">
                      
                      {/* Column 1: Icon & Title */}
                      <div className="flex w-full items-center gap-4 sm:w-1/2">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${styled.iconClass}`}>
                          <styled.Icon size={18} strokeWidth={2.2} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{styled.title}</p>
                          {item.receipt && (
                            <p className="mt-0.5 text-xs font-medium text-slate-400">Ref: {item.receipt}</p>
                          )}
                        </div>
                      </div>

                      {/* Column 2: Date */}
                      <div className="w-full pl-14 sm:w-1/4 sm:pl-0">
                        <p className="text-xs font-semibold text-slate-500 sm:text-sm">{formatDate(item.at)}</p>
                      </div>

                      {/* Column 3: Amount */}
                      <div className="w-full pl-14 text-left sm:w-1/4 sm:pl-0 sm:text-right">
                        {item.amount != null ? (
                          <p className={`text-sm font-bold tabular-nums tracking-tight ${styled.amountClass}`}>
                            KES {formatKes(item.amount)}
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-slate-400">—</p>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-12 flex flex-col items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row pb-8">
            <div className="flex gap-4">
              <Link href="#" className="hover:text-slate-600">Terms of Use</Link>
              <span>|</span>
              <Link href="#" className="hover:text-slate-600">Privacy Policy</Link>
            </div>
            <p className="mt-4 sm:mt-0">© 2026 Imara Holdings PLC</p>
          </footer>

        </main>
      </div>

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
              <Link href="/activity" className="flex items-center gap-4 rounded-lg bg-white/15 px-4 py-3.5 text-sm font-medium text-white">
                <FileText size={20} /> Activity
              </Link>
            </nav>
          </aside>
        </div>
      )}

    </div>
  );
}