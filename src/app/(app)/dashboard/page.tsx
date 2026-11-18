'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, Receipt, WalletCards, ArrowLeftRight,
  Smartphone, PiggyBank, FileText, Zap, Globe, Store, CalendarClock,
  Landmark, Send, Plus, Calendar, Clock, ClipboardList, Shield,
  Headphones, ArrowDownLeft, ArrowUpRight, AlertTriangle, Eye, EyeOff, Wallet,
  BarChart3, Package, Target
} from 'lucide-react';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { ActivityItem, Eligibility, Loan, LoanScheduleEntry } from '@/lib/loans';

const QUICK_ACTIONS = [
  { icon: ClipboardList, label: 'Apply Loan', href: '/apply/loan', color: 'bg-[#0f2f66]' },
  { icon: FileText, label: 'Loan Statement', href: '/loans/statement', color: 'bg-sky-500' },
  { icon: PiggyBank, label: 'My Savings', href: '/savings', color: 'bg-emerald-500' },
  { icon: BarChart3, label: 'Credit Score', href: '/credit-score', color: 'bg-amber-500' },
  { icon: Package, label: 'Products', href: '/products', color: 'bg-violet-500' },
];

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

function formatKes(amount: any): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(n) ? '0' : Math.round(n).toLocaleString('en-KE');
}
function formatKesDecimals(amount: number): string {
  return amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(d); end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}
function computeProgress(loan: Loan): number {
  const principal = parseFloat(loan.principal_amount || '0');
  const outstanding = parseFloat(loan.outstanding_principal || '0');
  if (!principal || principal <= 0) return 0;
  const pct = ((principal - outstanding) / principal) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}
function nextInstallment(schedule: LoanScheduleEntry[]): LoanScheduleEntry | null {
  if (!Array.isArray(schedule) || schedule.length === 0) return null;
  return schedule.find((s) => s.status !== 'PAID' && Number(s.total_paid || 0) < (Number(s.total_due || 0) + Number(s.penalty_due || 0))) || null;
}
function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function activityRow(item: ActivityItem) {
  const ok = 'bg-emerald-50 text-emerald-600';
  const done = 'bg-sky-50 text-sky-600';
  switch (item.kind) {
    case 'repayment_received': return { title: 'Repayment received', sub: 'Loan repayment', Icon: ArrowDownLeft, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '+ ', status: 'Success', statusClass: ok, isIncome: true };
    case 'loan_submitted': return { title: 'Loan application', sub: 'Loan', Icon: Receipt, iconClass: 'bg-slate-500', amountClass: 'text-slate-900', sign: '', status: 'Submitted', statusClass: done, isIncome: false };
    case 'loan_approved': return { title: 'Loan approved', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-slate-900', sign: '', status: 'Approved', statusClass: ok, isIncome: false };
    case 'loan_rejected': return { title: 'Loan declined', sub: 'Loan', Icon: Receipt, iconClass: 'bg-rose-500', amountClass: 'text-rose-600', sign: '', status: 'Declined', statusClass: 'bg-rose-50 text-rose-600', isIncome: false };
    case 'loan_disbursed': return { title: 'Loan disbursed', sub: 'Loan', Icon: WalletCards, iconClass: 'bg-blue-600', amountClass: 'text-slate-900', sign: '', status: 'Completed', statusClass: done, isIncome: true };
    case 'loan_active': return { title: 'Loan active', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '', status: 'Success', statusClass: ok, isIncome: false };
    case 'loan_overdue': return { title: 'Loan overdue', sub: 'Loan', Icon: AlertTriangle, iconClass: 'bg-rose-500', amountClass: 'text-rose-600', sign: '', status: 'Overdue', statusClass: 'bg-rose-50 text-rose-600', isIncome: false };
    case 'loan_paid': return { title: 'Loan fully repaid', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '', status: 'Success', statusClass: ok, isIncome: false };
    default: return { title: 'Loan update', sub: 'Loan', Icon: Receipt, iconClass: 'bg-slate-500', amountClass: 'text-slate-900', sign: '', status: 'Completed', statusClass: done, isIncome: false };
  }
}

function CardIcon({ icon: Icon, tile }: { icon: any; tile: string }) {
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${tile}`}>
      <Icon size={22} />
    </div>
  );
}

export default function DashboardPage() {
  const [borrower, setBorrower] = useState<any>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<LoanScheduleEntry[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceHidden, setBalanceHidden] = useState(false);

  useEffect(() => {
    try { setBalanceHidden(window.localStorage.getItem('imara.balance.hidden') === '1'); } catch {}
  }, []);
  function toggleBalance() {
    setBalanceHidden((v) => {
      const next = !v;
      try { window.localStorage.setItem('imara.balance.hidden', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, eligRes, activeLoansRes, activityRes] = await Promise.allSettled([
          import('@/lib/api').then(m => m.imara.me()),
          loansApi.getEligibility(),
          loansApi.getLoans({ limit: 5 }),
          loansApi.getActivity({ limit: 10 }),
        ]);
        
        if (cancelled) return;

        if (meRes.status === 'fulfilled') setBorrower(meRes.value.data);
        if (eligRes.status === 'fulfilled') setEligibility(eligRes.value.data);

        let active: Loan | null = null;
        if (activeLoansRes.status === 'fulfilled') {
          const list = activeLoansRes.value.data || [];
          active = list.find((l: any) => l.status === 'ACTIVE' || l.status === 'OVERDUE') || null;
          setActiveLoan(active);
        }
        
        if (activityRes.status === 'fulfilled') setActivity(activityRes.value.data || []);
        
        if (active) {
          try {
            const detail = await loansApi.getLoan(active.id);
            if (!cancelled) setActiveSchedule(detail.data.schedule || []);
          } catch {}
        }
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const derived = useMemo(() => {
    if (!borrower) return null;
    const emailName = String(borrower.email || '').split('@')[0];
    const firstName = capitalize(borrower.first_name || emailName);
    const progress = activeLoan ? computeProgress(activeLoan) : 0;
    const nextInst = activeSchedule.length > 0 ? nextInstallment(activeSchedule) : null;
    const loanOutstanding = activeLoan ? toNumber(activeLoan.outstanding_total) : 0;
    const totalDue = activeLoan ? toNumber(activeLoan.total_due) : 0;

    let nextPaymentAmount = String(loanOutstanding);
    let installment = totalDue;
    if (nextInst) {
      const due = Number(nextInst.total_due || 0);
      const paid = Number(nextInst.total_paid || 0);
      const penalty = Number(nextInst.penalty_due || 0);
      nextPaymentAmount = String(Math.max(0, (due + penalty) - paid));
      installment = due;
    }
    const nextPaymentDate = nextInst ? nextInst.due_date : activeLoan ? loanDueDate(activeLoan) : null;
    const dueIn = daysUntil(nextPaymentDate);

    const rawScore = eligibility?.credit_limit?.credit_score || 50;
    let creditStatus = 'Poor';
    let pill = 'bg-rose-50 text-rose-500';
    if (rawScore >= 700) { creditStatus = 'Excellent'; pill = 'bg-emerald-50 text-emerald-600'; }
    else if (rawScore >= 500) { creditStatus = 'Good'; pill = 'bg-blue-50 text-blue-600'; }
    else if (rawScore >= 300) { creditStatus = 'Fair'; pill = 'bg-amber-50 text-amber-600'; }

    return { firstName, progress, nextPaymentAmount, nextPaymentDate, dueIn, installment, rawScore, creditStatus, pill, loanOutstanding, totalDue };
  }, [borrower, eligibility, activeLoan, activeSchedule]);

  if (loading || !borrower || !derived) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading your dashboard...</p>
      </div>
    );
  }

  const loanActive = activeLoan !== null;
  const isOverdue = activeLoan?.status === 'OVERDUE';
  const repayHref = loanActive ? `/repay/${activeLoan.id}` : '/loans';
  const dueLabel = derived.dueIn === null ? '—' : derived.dueIn < 0 ? `${Math.abs(derived.dueIn)} days ago` : derived.dueIn === 0 ? 'Today' : `${derived.dueIn} day${derived.dueIn === 1 ? '' : 's'}`;

  const walletBalance = 0;
  const savingsBalance = 0;

  const HERO_BTN = 'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:flex-none sm:px-6';

  return (
    <div className="mx-auto grid max-w-[1260px] grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
      
      <div className="min-w-0 space-y-5">
        <section aria-label="Balances" className="rounded-2xl bg-[#0b2a57] px-5 py-6 text-white sm:px-8 sm:py-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-medium text-slate-300">{greeting()}, {derived.firstName}</p>
            <button
              type="button"
              onClick={toggleBalance}
              aria-label={balanceHidden ? 'Show balances' : 'Hide balances'}
              aria-pressed={balanceHidden}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              {balanceHidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[1.5fr_1fr] md:gap-8">
            <div>
              <p className="flex items-center gap-2 text-[13px] font-medium text-slate-300">
                <Wallet size={16} /> Wallet
              </p>
              <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
                <span className="mr-1.5 text-[14px] font-semibold text-slate-300 sm:text-[16px]">KES</span>
                {balanceHidden ? '••••••' : formatKesDecimals(walletBalance)}
              </p>
              <p className="mt-0.5 text-[13px] text-slate-300">
                {walletBalance === 0 ? 'Add money to get started.' : 'Available funds'}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/wallet" className={`${HERO_BTN} bg-emerald-400 text-[#0b2a57] hover:bg-emerald-300`}>
                  <Plus size={16} /> Deposit
                </Link>
                <Link href="/m-pesa" className={`${HERO_BTN} bg-white/10 text-white hover:bg-white/20`}>
                  <Send size={16} /> Send
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-5 md:block md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-medium text-slate-300">
                  <PiggyBank size={16} /> Savings
                </p>
                <p className="mt-1 text-[18px] font-bold leading-tight tracking-tight md:text-[20px]">
                  <span className="mr-1 text-[12px] font-semibold text-slate-300 md:text-[13px]">KES</span>
                  {balanceHidden ? '••••••' : formatKesDecimals(savingsBalance)}
                </p>
              </div>
              <Link
                href="/savings"
                className="inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-emerald-300 transition-colors hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 md:mt-3"
              >
                {savingsBalance === 0 ? 'Start saving' : 'Add to savings'} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className={`${CARD} overflow-hidden`}>
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <h3 className="text-[16px] font-bold text-[#0f2f66]">Quick Actions</h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-5 gap-2 sm:gap-4">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-2">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition-transform group-hover:scale-105 ${a.color}`}>
                    <a.icon size={22} strokeWidth={1.9} />
                  </div>
                  <span className="text-center text-[10px] font-semibold leading-tight text-slate-700 sm:text-[11px]">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#0f2f66]">Recent Activity</h3>
            <Link href="/transactions" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">View all <ArrowRight size={12} /></Link>
          </div>
          {activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No recent activity.</div>
          ) : (
            <div className="space-y-1">
              {activity.slice(0, 3).map((item: any, i) => {
                const row = activityRow(item);
                const dateString = item.created_at || item.occurred_at || item.date || null;
                return (
                  <Link key={i} href="/transactions" className="flex items-center justify-between rounded-xl px-2 py-3 transition-colors hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${row.iconClass}`}>
                        <row.Icon size={18} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900">{row.title}</p>
                        <p className="text-[11px] text-slate-500">{formatDate(dateString)} • {formatTime(dateString)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[14px] font-bold ${row.amountClass}`}>
                        {item.amount ? `${row.sign}KES ${formatKes(item.amount)}` : '—'}
                      </p>
                      <span className={`text-[10px] font-semibold ${row.statusClass.split(' ')[1]}`}>{row.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <Link href="/transactions" className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50">
            View All Transactions
          </Link>
        </section>
      </div>

      <div className="min-w-0 space-y-5">
        <section className={`${CARD} flex flex-col p-4 sm:p-5`}>
          <div className="flex items-center gap-3">
            <CardIcon icon={Landmark} tile="bg-emerald-600" />
            <p className="text-[14px] font-semibold text-slate-800">Outstanding Loan</p>
          </div>
          <h3 className="mt-3 text-[28px] font-extrabold leading-tight text-[#0f2f66]">
            KES {formatKes(loanActive ? derived.loanOutstanding : 0)}
          </h3>
          <p className="text-[13px] text-slate-500">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>

          {loanActive && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-500">
                <span>Repaid</span>
                <span>{derived.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isOverdue ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${derived.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div className="flex items-start gap-2.5">
              <Calendar size={16} className="mt-0.5 text-slate-500" />
              <div>
                <p className="text-slate-500">Next Payment</p>
                <p className="text-[13px] font-bold text-slate-900">KES {loanActive ? formatKes(derived.nextPaymentAmount) : '0'}</p>
                <p className="text-slate-500">{loanActive ? formatDate(derived.nextPaymentDate) : '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 border-l border-slate-100 pl-3">
              <Clock size={16} className="mt-0.5 text-slate-500" />
              <div>
                <p className="text-slate-500">Due In</p>
                <p className={`text-[13px] font-bold ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>{loanActive ? dueLabel : '—'}</p>
              </div>
            </div>
          </div>

          {loanActive ? (
            <Link href={repayHref} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-100/80 py-2.5 text-[13px] font-bold text-emerald-800 transition hover:bg-emerald-100">
              Repay Loan <ArrowRight size={14} />
            </Link>
          ) : (
            <Link href="/apply/loan" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#0a5cbe] py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#084b9c]">
              Apply for a Loan <ArrowRight size={14} />
            </Link>
          )}
        </section>

        {/* SAVINGS GOAL WIDGET */}
        <section className={`${CARD} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-emerald-600" />
              <h3 className="text-[15px] font-bold text-[#0f2f66]">Savings Goal</h3>
            </div>
            <Link href="/savings" className="text-[11px] font-semibold text-emerald-600 hover:underline">View</Link>
          </div>
          
          <div className="mb-2 flex justify-between items-end">
            <div>
              <p className="text-[12px] text-slate-500">Emergency Fund</p>
              <p className="text-[20px] font-extrabold text-[#0f2f66]">KES 5,000</p>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">of KES 20,000</p>
          </div>
          
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 mb-3">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: '25%' }} />
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+ KES 45 interest earned</p>
            <button className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700">Add Money</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Headphones size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-slate-900">Need help?</h3>
              <p className="text-[11px] text-slate-500">Our support team is here.</p>
            </div>
            <Link href="/support" className="ml-auto text-[12px] font-semibold text-emerald-600 hover:underline">Contact</Link>
          </div>
        </section>
      </div>
    </div>
  );
}