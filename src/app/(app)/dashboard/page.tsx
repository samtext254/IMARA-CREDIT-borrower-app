'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Check, CheckCircle2, Receipt, WalletCards, ArrowLeftRight,
  Smartphone, PiggyBank, FileText, Zap, Globe, Store, CalendarClock,
  Landmark, Send, Plus, Calendar, Clock, ClipboardList, Shield,
  Headphones, ArrowDownLeft, AlertTriangle, Eye, EyeOff, Wallet,
  BarChart3, Package
} from 'lucide-react';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { ActivityItem, Eligibility, Loan, LoanScheduleEntry } from '@/lib/loans';

const QUICK_ACTION_GROUPS = [
  {
    title: 'Loans & Credit',
    actions: [
      { icon: ClipboardList, label: 'Apply Loan', href: '/apply/loan', color: 'bg-[#0f2f66]' },
      { icon: FileText, label: 'Loan Statement', href: '/loans/statement', color: 'bg-sky-500' },
    ]
  },
  {
    title: 'Savings & Score',
    actions: [
      { icon: PiggyBank, label: 'My Savings', href: '/savings', color: 'bg-emerald-500' },
      { icon: BarChart3, label: 'Credit Score', href: '/credit-score', color: 'bg-amber-500' },
    ]
  },
  {
    title: 'Explore',
    actions: [
      { icon: Package, label: 'Products', href: '/products', color: 'bg-violet-500' },
    ]
  }
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
    case 'repayment_received': return { title: 'Repayment received', sub: 'Loan repayment', Icon: ArrowDownLeft, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '+ ', status: 'Success', statusClass: ok };
    case 'loan_submitted': return { title: 'Loan application', sub: 'Loan', Icon: Receipt, iconClass: 'bg-slate-500', amountClass: 'text-slate-900', sign: '', status: 'Submitted', statusClass: done };
    case 'loan_approved': return { title: 'Loan approved', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-slate-900', sign: '', status: 'Approved', statusClass: ok };
    case 'loan_rejected': return { title: 'Loan declined', sub: 'Loan', Icon: Receipt, iconClass: 'bg-rose-500', amountClass: 'text-rose-600', sign: '', status: 'Declined', statusClass: 'bg-rose-50 text-rose-600' };
    case 'loan_disbursed': return { title: 'Loan disbursed', sub: 'Loan', Icon: WalletCards, iconClass: 'bg-blue-600', amountClass: 'text-slate-900', sign: '', status: 'Completed', statusClass: done };
    case 'loan_active': return { title: 'Loan active', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '', status: 'Success', statusClass: ok };
    case 'loan_overdue': return { title: 'Loan overdue', sub: 'Loan', Icon: AlertTriangle, iconClass: 'bg-rose-500', amountClass: 'text-rose-600', sign: '', status: 'Overdue', statusClass: 'bg-rose-50 text-rose-600' };
    case 'loan_paid': return { title: 'Loan fully repaid', sub: 'Loan', Icon: CheckCircle2, iconClass: 'bg-emerald-500', amountClass: 'text-emerald-600', sign: '', status: 'Success', statusClass: ok };
    default: return { title: 'Loan update', sub: 'Loan', Icon: Receipt, iconClass: 'bg-slate-500', amountClass: 'text-slate-900', sign: '', status: 'Completed', statusClass: done };
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

  // Remember the person's choice to hide balances.
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
  const ringR = 26;
  const ringC = 2 * Math.PI * ringR;
  const ringPct = loanActive ? derived.progress : 0;
  const dueLabel = derived.dueIn === null ? '—' : derived.dueIn < 0 ? `${Math.abs(derived.dueIn)} days ago` : derived.dueIn === 0 ? 'Today' : `${derived.dueIn} day${derived.dueIn === 1 ? '' : 's'}`;

  // TODO: replace both with real values once the wallet and savings APIs are available
  // (e.g. walletApi.getBalance(), savingsApi.getTotal()). Until then they are always 0.
  const walletBalance = 0;
  const savingsBalance = 0;

  const HERO_BTN = 'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 sm:flex-none sm:px-6';

  return (
    <div className="mx-auto grid max-w-[1260px] grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
      
      <div className="min-w-0 space-y-5">
        {/* Hero: greeting + wallet (main) + savings (secondary) in one card */}
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
            {/* Wallet */}
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

            {/* Savings: stacked on desktop, compact row on mobile */}
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

        {/* Loan card (to be merged with Loan Summary in the next step) */}
        <section className={`${CARD} flex flex-col p-4 sm:p-5`}>
          <div className="flex items-center gap-3">
            <CardIcon icon={Landmark} tile="bg-emerald-600" />
            <p className="text-[14px] font-semibold text-slate-800">Outstanding Loan</p>
          </div>
          <h3 className="mt-3 text-[28px] font-extrabold leading-tight text-[#0f2f66]">KES {formatKes(loanActive ? derived.loanOutstanding : 0)}</h3>
          <p className="text-[13px] text-slate-500">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>
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
          <Link href={repayHref} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-100/80 py-2.5 text-[13px] font-bold text-emerald-800 transition hover:bg-emerald-100">Repay Loan <ArrowRight size={14} /></Link>
        </section>

        <section className={`${CARD} overflow-hidden`}>
          <div className="border-b border-slate-100 bg-white px-5 py-4">
            <h3 className="text-[16px] font-bold text-[#0f2f66]">Quick Actions</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {QUICK_ACTION_GROUPS.map((group, idx) => (
              <div key={idx} className="p-4 sm:p-5">
                <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.title}</h4>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  {group.actions.map((a) => (
                    <Link key={a.label} href={a.href} className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 sm:w-auto">
                      <div className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-sm transition-transform group-hover:scale-105 ${a.color}`}><a.icon size={22} strokeWidth={1.9} /></div>
                      <span className="text-center text-[11px] font-semibold leading-tight text-slate-700">{a.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[#0f2f66]">Recent Transactions</h3>
            <Link href="/transactions" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">View all <ArrowRight size={12} /></Link>
          </div>
          {activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No recent transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[56px_1.4fr_1.3fr_1fr_1fr] rounded-lg bg-[#F1F5FB] px-3 py-2 text-[11px] font-semibold text-slate-500">
                  <span>Type</span><span>Description</span><span>Date &amp; Time</span><span>Amount</span><span>Status</span>
                </div>
                {activity.slice(0, 4).map((item: any, i) => {
                  const row = activityRow(item);
                  const dateString = item.created_at || item.occurred_at || item.date || null;
                  return (
                    <div key={i} className="grid grid-cols-[56px_1.4fr_1.3fr_1fr_1fr] items-center border-b border-slate-100 px-3 py-3 last:border-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${row.iconClass}`}><row.Icon size={15} /></div>
                      <div>
                        <p className="text-[12px] font-bold text-slate-900">{row.title}</p>
                        <p className="text-[10px] text-slate-500">{row.sub}</p>
                      </div>
                      <p className="text-[11px] text-slate-500">{formatDate(dateString)} &nbsp;•&nbsp; {formatTime(dateString)}</p>
                      <p className={`text-[13px] font-extrabold ${row.amountClass}`}>{item.amount ? `${row.sign}KES ${formatKes(item.amount)}` : '—'}</p>
                      <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-semibold ${row.statusClass}`}>{row.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="min-w-0 space-y-5">
        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[17px] font-bold text-[#0f2f66]">Loan Summary</h3>
            <Link href="/loans" className="flex items-center gap-1 text-[12px] font-semibold text-[#0a5cbe] hover:underline">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="mb-3 flex items-center justify-between rounded-xl bg-[#EEF4FC] p-3.5">
            <div className="flex items-center gap-3">
              <CardIcon icon={WalletCards} tile="bg-[#1565d8]" />
              <div>
                <p className="text-[12px] font-medium text-slate-600">Current Loan</p>
                <p className="text-[22px] font-extrabold leading-tight text-[#0f2f66]">KES {formatKes(loanActive ? derived.loanOutstanding : 0)}</p>
                <p className="text-[11px] text-slate-500">of KES {formatKes(loanActive ? derived.totalDue : 0)} total</p>
              </div>
            </div>
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                <circle cx="32" cy="32" r={ringR} fill="none" stroke="#DCE6F5" strokeWidth="6" />
                <circle cx="32" cy="32" r={ringR} fill="none" stroke={isOverdue ? '#F43F5E' : '#0f9d74'} strokeWidth="6" strokeLinecap="round" strokeDasharray={ringC} strokeDashoffset={ringC - (ringC * ringPct) / 100} />
              </svg>
              <span className="absolute text-[13px] font-extrabold text-[#0f2f66]">{ringPct}%</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between py-3.5"><span className="flex items-center gap-3 text-[13px] text-slate-500"><Calendar size={16} /> Next Payment</span><span className="text-[13px] font-bold text-slate-900">{loanActive ? formatDate(derived.nextPaymentDate) : '—'}</span></div>
            <div className="flex items-center justify-between py-3.5"><span className="flex items-center gap-3 text-[13px] text-slate-500"><Receipt size={16} /> Monthly Installment</span><span className="text-[13px] font-bold text-slate-900">KES {loanActive ? formatKes(derived.installment) : '0'}</span></div>
            <div className="flex items-center justify-between pt-3.5"><span className="flex items-center gap-3 text-[13px] text-slate-500"><ClipboardList size={16} /> Loan Status</span>
              {loanActive ? (
                <span className={`rounded-full px-4 py-1 text-[12px] font-bold ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{isOverdue ? 'Overdue' : 'Active'}</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-4 py-1 text-[12px] font-bold text-slate-600">None</span>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-4">
            <Shield size={16} className="text-slate-400" />
            <p className="text-[13px] text-slate-600">Your credit score is <span className={`font-bold ${derived.pill.replace('bg-', 'text-').split(' ')[0]}`}>{derived.creditStatus}</span> ({derived.rawScore}%)</p>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#E9F8F0] to-[#D3F0E1] p-5">
          <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-emerald-300/40" />
          <div className="pointer-events-none absolute -bottom-14 right-0 h-36 w-44 rounded-[100%] bg-emerald-400/30" />
          <div className="relative z-10 max-w-[64%]">
            <h3 className="text-[19px] font-bold text-[#0f2f66]">Need a bigger loan?</h3>
            <p className="mb-4 mt-2 text-[13px] leading-snug text-slate-700">Get up to KES 50,000 with flexible repayment terms.</p>
            <Link href="/apply/loan" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:brightness-105">Apply Now <ArrowRight size={14} /></Link>
          </div>
          <div className="absolute bottom-4 right-5 z-10">
            <div className="relative">
              <div className="flex h-24 w-[72px] rotate-3 flex-col items-start gap-1.5 rounded-md bg-white p-2.5 shadow-lg">
                <span className="text-[6px] font-extrabold text-slate-700">LOAN</span>
                <div className="h-1.5 w-8 rounded bg-slate-300" /><div className="h-1 w-10 rounded bg-slate-200" /><div className="h-1 w-7 rounded bg-slate-200" /><div className="h-1 w-9 rounded bg-slate-200" />
              </div>
              <div className="absolute -bottom-3 -right-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow-lg"><Check size={17} strokeWidth={3} className="text-white" /></div>
            </div>
          </div>
        </section>

        <section className={`${CARD} p-5`}>
          <div className="flex items-center gap-4">
            <Headphones size={40} strokeWidth={1.4} className="shrink-0 text-[#0f2f66]" />
            <div>
              <h3 className="text-[16px] font-bold text-[#0f2f66]">Need help?</h3>
              <p className="text-[12px] text-slate-500">Our support team is here for you.</p>
            </div>
          </div>
          <Link href="/support" className="mx-auto mt-4 flex w-[78%] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 py-2.5 text-[13px] font-semibold text-[#0a5cbe] transition hover:bg-blue-50">Contact Support <ArrowRight size={14} /></Link>
        </section>
      </div>
    </div>
  );
}