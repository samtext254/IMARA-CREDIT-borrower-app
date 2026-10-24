'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Clock3, Loader2, Receipt, ShieldAlert,
  Home, Shield, Compass, FileText, HelpCircle, LogOut, Menu, X
} from 'lucide-react';
import { loans as loansApi } from '@/lib/loans';
import type { Loan, LoanScheduleEntry } from '@/lib/loans';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function formatKes(amount: string | number | null | undefined): string {
  const n = toNumber(amount);
  return Math.round(n).toLocaleString('en-KE');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING':     return 'Awaiting approval';
    case 'APPROVED':    return 'Approved, not yet disbursed';
    case 'DISBURSED':   return 'Disbursed, activating';
    case 'ACTIVE':      return 'Active';
    case 'OVERDUE':     return 'Overdue';
    case 'PAID':        return 'Paid in full';
    case 'REJECTED':    return 'Rejected';
    case 'DEFAULTED':   return 'Defaulted';
    case 'WRITTEN_OFF': return 'Written off';
    default:            return status;
  }
}

function statusTone(status: string) {
  switch (status) {
    case 'ACTIVE': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: <CheckCircle2 size={18} strokeWidth={2.4} /> };
    case 'OVERDUE': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: <AlertTriangle size={18} strokeWidth={2.4} /> };
    case 'PAID': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: <CheckCircle2 size={18} strokeWidth={2.4} /> };
    case 'PENDING':
    case 'APPROVED':
    case 'DISBURSED': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: <Clock3 size={18} strokeWidth={2.4} /> };
    default: return { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-700', icon: <Receipt size={18} strokeWidth={2.4} /> };
  }
}

function instalmentStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return 'Upcoming';
    case 'PARTIAL': return 'Partially paid';
    case 'PAID':    return 'Paid';
    case 'OVERDUE': return 'Overdue';
    case 'WAIVED':  return 'Waived';
    default:        return status;
  }
}

function instalmentStatusTone(status: string): string {
  switch (status) {
    case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PARTIAL': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'OVERDUE': return 'bg-red-50 text-red-700 border-red-200';
    case 'WAIVED': return 'bg-slate-100 text-slate-600 border-slate-200';
    default: return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

function BreakdownRow({ label, value, emphasize }: { label: string; value: string; emphasize?: 'bold' | 'red'; }) {
  const labelClass = emphasize === 'bold' ? 'text-sm font-bold text-slate-900' : 'text-sm text-slate-500';
  const valueClass = emphasize === 'bold' ? 'text-sm font-bold text-slate-900 tabular-nums' : emphasize === 'red' ? 'text-sm font-bold text-red-600 tabular-nums' : 'text-sm font-semibold text-slate-700 tabular-nums';
  return (
    <div className="flex items-center justify-between py-3">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<LoanScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await loansApi.getLoan(id);
        if (cancelled) return;
        setLoan(res.data.loan);
        setSchedule(res.data.schedule || []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load loan.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const derived = useMemo(() => {
    if (!loan) return null;

    const outstandingPrincipal = toNumber(loan.outstanding_principal);
    const outstandingInterest  = toNumber(loan.outstanding_interest);
    const outstandingFees      = toNumber(loan.outstanding_fees);
    const outstandingPenalty   = toNumber(loan.outstanding_penalty);
    const outstandingTotal     = toNumber(loan.outstanding_total);

    const principal = toNumber(loan.principal_amount);
    const repaid = Math.max(0, principal - outstandingPrincipal);
    const progressPct = principal > 0 ? Math.min(100, Math.max(0, Math.round((repaid / principal) * 100))) : 0;

    const nextInst = schedule.find((s) => s.status !== 'PAID' && s.status !== 'WAIVED' && toNumber(s.total_paid) < toNumber(s.total_due)) || null;
    const nextInstOutstanding = nextInst ? Math.max(0, toNumber(nextInst.total_due) - toNumber(nextInst.total_paid)) : 0;
    const nextInstDue = nextInst ? nextInstOutstanding + outstandingPenalty : outstandingTotal;

    return {
      outstandingPrincipal, outstandingInterest, outstandingFees, outstandingPenalty, outstandingTotal,
      progressPct, nextInst, nextInstDue, hasPenalty: outstandingPenalty > 0,
    };
  }, [loan, schedule]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F6F8]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0077C8] border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading loan details...</p>
      </div>
    );
  }

  if (error || !loan || !derived) {
    return (
      <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F6F8] font-sans text-slate-800">
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/50">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Could not load loan</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{error || 'Loan not found.'}</p>
            <button onClick={() => router.push('/dashboard')} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#0077C8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0060a3]">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tone = statusTone(loan.status);
  const canRepay = loan.status === 'ACTIVE' || loan.status === 'OVERDUE';

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F6F8] font-sans text-slate-800">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 flex-col bg-[#0077C8] text-white md:flex shrink-0">
        <div className="flex h-24 items-center px-8">
          <button onClick={() => router.push('/dashboard')} className="leading-tight text-left">
            <h1 className="text-3xl font-bold tracking-tight text-white">Imara</h1>
            <p className="text-[10px] font-medium text-white/80">With you every step of the way</p>
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          <button onClick={() => router.push('/dashboard')} className="flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Home size={20} className="text-white/70" /> Dashboard
          </button>
          <button onClick={() => router.push('/products')} className="flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Shield size={20} className="text-white/70" /> Products
          </button>
          <button onClick={() => router.push('/discover')} className="flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <Compass size={20} className="text-white/70" /> Discover
          </button>
          <button onClick={() => router.push('/activity')} className="flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <FileText size={20} className="text-white/70" /> Activity
          </button>
          <button onClick={() => router.push('/help')} className="flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <HelpCircle size={20} className="text-white/70" /> Help
          </button>
        </nav>
        <div className="p-6">
          <button onClick={() => router.push('/login')} className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-semibold text-[#0077C8] shadow-sm transition hover:bg-slate-50">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        <header className="flex h-[72px] shrink-0 items-center justify-between bg-white px-4 sm:px-8 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Loan Details</p>
                <h1 className="text-lg font-bold text-slate-900 leading-tight font-mono">{loan.loan_reference}</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8A65] text-sm font-bold text-white ring-2 ring-white">
              SC
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="mx-auto max-w-[1200px] p-4 sm:p-8">
            
            {/* STATUS BANNER */}
            <div className={`mb-6 flex items-center gap-3 rounded-xl border ${tone.border} ${tone.bg} px-5 py-4`}>
              <div className={`shrink-0 ${tone.text}`}>{tone.icon}</div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${tone.text}`}>{loan.status}</p>
                <p className={`mt-0.5 text-base font-bold ${tone.text}`}>{statusLabel(loan.status)}</p>
              </div>
            </div>

            {/* PENALTY ALERT */}
            {derived.hasPenalty && (
              <div className="mb-6 flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <ShieldAlert size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-700/80">Late payment fee</p>
                  <p className="mt-1 text-base font-bold text-red-900">KES {formatKes(derived.outstandingPenalty)} penalty applied</p>
                  <p className="mt-1 text-sm text-red-800/90">This fee was added because an instalment was paid late. It has been included in the outstanding balance below.</p>
                </div>
              </div>
            )}

            {/* HERO CARD */}
            <div className="mb-6 overflow-hidden rounded-2xl bg-[#0077C8] p-8 text-white shadow-lg">
              <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Total Outstanding</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">KES {formatKes(derived.outstandingTotal)}</p>
                  <p className="mt-2 text-sm font-medium text-blue-100">{derived.progressPct}% repaid of KES {formatKes(loan.principal_amount)} principal</p>
                </div>
                <div className="w-full max-w-[200px] sm:w-1/3">
                  <div className="h-2 w-full rounded-full bg-white/20">
                    <div className="h-full rounded-full bg-[#E9B63F] transition-all" style={{ width: `${derived.progressPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* DESKTOP GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                
                {/* NEXT PAYMENT */}
                {derived.nextInst && (
                  <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Next Payment</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-slate-900">Instalment {derived.nextInst.installment_no}</p>
                        <p className="mt-1 text-sm text-slate-500">Due {formatDate(derived.nextInst.due_date)}</p>
                      </div>
                      <p className="text-2xl font-extrabold text-slate-900 tabular-nums">KES {formatKes(derived.nextInstDue)}</p>
                    </div>
                  </div>
                )}

                {/* BREAKDOWN */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Breakdown</h3>
                  <div className="divide-y divide-slate-100">
                    <BreakdownRow label="Principal outstanding" value={`KES ${formatKes(derived.outstandingPrincipal)}`} />
                    <BreakdownRow label="Interest outstanding" value={`KES ${formatKes(derived.outstandingInterest)}`} />
                    {derived.outstandingFees > 0 && <BreakdownRow label="Fees outstanding" value={`KES ${formatKes(derived.outstandingFees)}`} />}
                    {derived.hasPenalty && <BreakdownRow label="Late payment fee" value={`KES ${formatKes(derived.outstandingPenalty)}`} emphasize="red" />}
                    <BreakdownRow label="Total due" value={`KES ${formatKes(derived.outstandingTotal)}`} emphasize="bold" />
                  </div>
                </div>

                {/* TERMS */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Terms</h3>
                  <div className="divide-y divide-slate-100">
                    <BreakdownRow label="Principal" value={`KES ${formatKes(loan.principal_amount)}`} />
                    <BreakdownRow label="Interest" value={`KES ${formatKes(loan.interest_amount)}`} />
                    <BreakdownRow label="Total to repay" value={`KES ${formatKes(loan.total_due)}`} />
                    <BreakdownRow label="Term" value={`${loan.term_days} days`} />
                    <BreakdownRow label="Frequency" value={loan.repayment_frequency || '—'} />
                    <BreakdownRow label="Interest rate" value={`${loan.interest_rate}% ${(loan.interest_period || '').toLowerCase()}`} />
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                
                {/* TIMELINE */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Timeline</h3>
                  <div className="divide-y divide-slate-100">
                    <BreakdownRow label="Requested" value={formatDate(loan.requested_at)} />
                    <BreakdownRow label="Approved" value={formatDate(loan.approved_at)} />
                    <BreakdownRow label="Disbursed" value={formatDate(loan.disbursed_at)} />
                    <BreakdownRow label="First due date" value={formatDate(loan.first_due_date)} />
                    <BreakdownRow label="Maturity" value={formatDate(loan.maturity_date)} />
                    <BreakdownRow label="Closed" value={formatDate(loan.closed_at)} />
                  </div>
                </div>

                {/* SCHEDULE */}
                <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200/50 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Repayment Schedule</h3>
                    {schedule.length > 0 && (
                      <span className="text-xs font-bold text-slate-500">
                        {schedule.filter((s) => s.status === 'PAID').length}/{schedule.length} paid
                      </span>
                    )}
                  </div>

                  {schedule.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm text-slate-500">No repayment schedule yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                      {schedule.map((row) => {
                        const totalDue = toNumber(row.total_due);
                        const paid = toNumber(row.total_paid);
                        const penaltyDue = toNumber(row.penalty_due);
                        const outstandingOnRow = Math.max(0, totalDue - paid) + penaltyDue;
                        const isPaid = row.status === 'PAID';

                        return (
                          <div key={row.id || row.installment_no} className="p-5 transition hover:bg-slate-50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-[#0077C8]'}`}>
                                  {isPaid ? <CheckCircle2 size={18} /> : row.installment_no}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">Instalment {row.installment_no}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">Due {formatDate(row.due_date)}</p>
                                  {penaltyDue > 0 && (
                                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                                      <AlertTriangle size={12} /> Includes KES {formatKes(penaltyDue)} late fee
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-bold text-slate-900 tabular-nums">KES {formatKes(outstandingOnRow)}</p>
                                <p className={`mt-1 text-xs tabular-nums ${isPaid ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                                  Paid KES {formatKes(paid)}
                                </p>
                                <span className={`mt-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${instalmentStatusTone(row.status)}`}>
                                  {instalmentStatusLabel(row.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="mt-12 text-center text-xs font-medium text-slate-400">
              IMARA CREDIT · {loan.currency}
            </div>

          </div>
        </main>
      </div>

      {/* MOBILE STICKY CTA */}
      {canRepay && (
        <div className="fixed bottom-[64px] left-0 z-40 w-full border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Link href={`/repay/${loan.id}`} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0077C8] text-sm font-bold text-white shadow-sm transition hover:bg-[#0060a3]">
            Repay Now <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white px-2 py-3 md:hidden">
        <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Home size={22} /><span className="text-[10px] font-medium">Home</span>
        </button>
        <button onClick={() => router.push('/apply')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Compass size={22} /><span className="text-[10px] font-medium">Apply</span>
        </button>
        <button onClick={() => router.push('/loans')} className="flex flex-col items-center gap-1 text-[#0077C8]">
          <FileText size={22} /><span className="text-[10px] font-bold">Loans</span>
        </button>
        <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <HelpCircle size={22} /><span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[10000] md:hidden">
          <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-[#0077C8] text-white shadow-2xl transition-transform">
            <div className="flex h-20 items-center justify-between px-6">
              <button onClick={() => router.push('/dashboard')} className="leading-tight text-left">
                <h1 className="text-2xl font-bold tracking-tight text-white">Imara</h1>
              </button>
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-4 mt-4">
              <button onClick={() => router.push('/dashboard')} className="flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-sm font-medium text-white/80">
                <Home size={20} /> Dashboard
              </button>
            </nav>
          </aside>
        </div>
      )}

    </div>
  );
}