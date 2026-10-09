// src/app/loans/[id]/page.tsx
'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Receipt,
  ShieldAlert,
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
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
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
    case 'ACTIVE':
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
        icon: <CheckCircle2 size={14} strokeWidth={2.4} />,
      };
    case 'OVERDUE':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: <AlertTriangle size={14} strokeWidth={2.4} />,
      };
    case 'PAID':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: <CheckCircle2 size={14} strokeWidth={2.4} />,
      };
    case 'PENDING':
    case 'APPROVED':
    case 'DISBURSED':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        icon: <Clock3 size={14} strokeWidth={2.4} />,
      };
    default:
      return {
        bg: 'bg-ink-100/60',
        border: 'border-ink-100',
        text: 'text-ink-700',
        icon: <Receipt size={14} strokeWidth={2.4} />,
      };
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
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PARTIAL':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'OVERDUE':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'WAIVED':
      return 'bg-ink-100/60 text-ink-600 border-ink-100';
    case 'PENDING':
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<LoanScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---------------------------- Derived --------------------------- */
  const derived = useMemo(() => {
    if (!loan) return null;

    const outstandingPrincipal = toNumber(loan.outstanding_principal);
    const outstandingInterest  = toNumber(loan.outstanding_interest);
    const outstandingFees      = toNumber(loan.outstanding_fees);
    const outstandingPenalty   = toNumber(loan.outstanding_penalty);
    const outstandingTotal     = toNumber(loan.outstanding_total);

    const principal = toNumber(loan.principal_amount);
    const repaid = Math.max(0, principal - outstandingPrincipal);
    const progressPct =
      principal > 0
        ? Math.min(100, Math.max(0, Math.round((repaid / principal) * 100)))
        : 0;

    const nextInst =
      schedule.find(
        (s) =>
          s.status !== 'PAID' &&
          s.status !== 'WAIVED' &&
          toNumber(s.paid_amount) < toNumber(s.total_due)
      ) || null;

    const nextInstOutstanding = nextInst
      ? Math.max(0, toNumber(nextInst.total_due) - toNumber(nextInst.paid_amount))
      : 0;

    const nextInstDue = nextInst
      ? nextInstOutstanding + outstandingPenalty
      : outstandingTotal;

    return {
      outstandingPrincipal,
      outstandingInterest,
      outstandingFees,
      outstandingPenalty,
      outstandingTotal,
      progressPct,
      nextInst,
      nextInstDue,
      hasPenalty: outstandingPenalty > 0,
    };
  }, [loan, schedule]);

  /* ---------------------------- Loading --------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-page grid place-items-center">
        <Loader2 className="animate-spin text-plum-800" size={28} />
      </div>
    );
  }

  /* ---------------------------- Error ----------------------------- */
  if (error || !loan || !derived) {
    return (
      <div className="min-h-screen bg-page">
        <div className="sticky top-0 z-20 bg-plum-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="grid h-9 w-9 place-items-center rounded-full text-white transition active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={2.4} />
            </button>
            <h1 className="text-[16px] font-semibold tracking-tight text-white">
              Loan details
            </h1>
          </div>
          <div className="h-1 w-full bg-brand-500" />
        </div>
        <div className="p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Could not load this loan</p>
                <p className="mt-1 text-red-700/90">
                  {error || 'Loan not found.'}
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/home')}
                  className="mt-3 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-red-800 ring-1 ring-red-200"
                >
                  Back to home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tone = statusTone(loan.status);
  const canRepay = loan.status === 'ACTIVE' || loan.status === 'OVERDUE';

  return (
    <div className={`min-h-screen bg-page ${canRepay ? 'pb-24' : 'pb-6'}`}>
      {/* ============ NAV ============ */}
      <div className="sticky top-0 z-20 bg-plum-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="grid h-9 w-9 place-items-center rounded-full text-white transition active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Loan
            </p>
            <h1 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-white font-mono">
              {loan.loan_reference}
            </h1>
          </div>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ STATUS BANNER ============ */}
      <div className="px-3 pt-3">
        <div
          className={`flex items-center gap-2 rounded-2xl border ${tone.border} ${tone.bg} px-4 py-3`}
        >
          <div className={`shrink-0 ${tone.text}`}>{tone.icon}</div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.text}`}
            >
              {loan.status}
            </p>
            <p className={`mt-0.5 text-[13px] font-semibold ${tone.text}`}>
              {statusLabel(loan.status)}
            </p>
          </div>
        </div>
      </div>

      {/* ============ PENALTY ALERT ============ */}
      {derived.hasPenalty && (
        <div className="px-3 pt-3">
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
              <ShieldAlert size={16} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700/80">
                Late payment fee
              </p>
              <p className="mt-0.5 text-[13.5px] font-bold tracking-tight text-red-900">
                KES {formatKes(derived.outstandingPenalty)} penalty applied
              </p>
              <p className="mt-0.5 text-[11px] text-red-800/90">
                This fee was added because an instalment was paid late. It has
                been included in the outstanding balance below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ HERO ============ */}
      <div className="px-3 pt-3">
        <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 pt-5 pb-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
              Total outstanding
            </p>
            <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
              KES {formatKes(derived.outstandingTotal)}
            </p>
            <p className="mt-1.5 text-[11px] font-medium text-plum-800/60">
              {derived.progressPct}% repaid of KES{' '}
              {formatKes(loan.principal_amount)} principal
            </p>
          </div>

          <div className="mt-4 h-1.5 w-full rounded-full bg-plum-800/10">
            <div
              className="h-full rounded-full bg-plum-800 transition-all"
              style={{ width: `${derived.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ============ NEXT PAYMENT ============ */}
      {derived.nextInst && (
        <section className="mt-3 bg-white">
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Next payment
            </h2>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[13px] font-semibold text-ink-950">
                Instalment {derived.nextInst.installment_number}
              </p>
              <p className="text-[11px] text-ink-400 mt-0.5">
                Due {formatDate(derived.nextInst.due_date)}
              </p>
            </div>
            <p className="text-[18px] font-bold text-ink-950 tabular-nums">
              KES {formatKes(derived.nextInstDue)}
            </p>
          </div>
        </section>
      )}

      {/* ============ BREAKDOWN ============ */}
      <section className="mt-3 bg-white">
        <div className="border-b border-ink-100 px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Breakdown
          </h2>
        </div>
        <div className="divide-y divide-ink-100">
          <BreakdownRow
            label="Principal outstanding"
            value={`KES ${formatKes(derived.outstandingPrincipal)}`}
          />
          <BreakdownRow
            label="Interest outstanding"
            value={`KES ${formatKes(derived.outstandingInterest)}`}
          />
          {derived.outstandingFees > 0 && (
            <BreakdownRow
              label="Fees outstanding"
              value={`KES ${formatKes(derived.outstandingFees)}`}
            />
          )}
          {derived.hasPenalty && (
            <BreakdownRow
              label="Late payment fee"
              value={`KES ${formatKes(derived.outstandingPenalty)}`}
              emphasize="red"
            />
          )}
          <BreakdownRow
            label="Total due"
            value={`KES ${formatKes(derived.outstandingTotal)}`}
            emphasize="bold"
          />
        </div>
      </section>

      {/* ============ TERMS ============ */}
      <section className="mt-3 bg-white">
        <div className="border-b border-ink-100 px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Terms
          </h2>
        </div>
        <div className="divide-y divide-ink-100">
          <BreakdownRow
            label="Principal"
            value={`KES ${formatKes(loan.principal_amount)}`}
          />
          <BreakdownRow
            label="Interest"
            value={`KES ${formatKes(loan.interest_amount)}`}
          />
          <BreakdownRow
            label="Total to repay"
            value={`KES ${formatKes(loan.total_due)}`}
          />
          <BreakdownRow label="Term" value={`${loan.term_days} days`} />
          <BreakdownRow
            label="Frequency"
            value={loan.repayment_frequency || '—'}
          />
          <BreakdownRow
            label="Interest rate"
            value={`${loan.interest_rate}% ${(loan.interest_period || '').toLowerCase()}`}
          />
        </div>
      </section>

      {/* ============ TIMELINE ============ */}
      <section className="mt-3 bg-white">
        <div className="border-b border-ink-100 px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Timeline
          </h2>
        </div>
        <div className="divide-y divide-ink-100">
          <BreakdownRow label="Requested" value={formatDate(loan.requested_at)} />
          <BreakdownRow label="Approved"  value={formatDate(loan.approved_at)} />
          <BreakdownRow label="Disbursed" value={formatDate(loan.disbursed_at)} />
          <BreakdownRow
            label="First due date"
            value={formatDate(loan.first_due_date)}
          />
          <BreakdownRow
            label="Maturity"
            value={formatDate(loan.maturity_date)}
          />
          <BreakdownRow label="Closed" value={formatDate(loan.closed_at)} />
        </div>
      </section>

      {/* ============ SCHEDULE ============ */}
      <section className="mt-3 bg-white">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Repayment schedule
          </h2>
          {schedule.length > 0 && (
            <span className="text-[10px] text-ink-400">
              {schedule.filter((s) => s.status === 'PAID').length}/
              {schedule.length} paid
            </span>
          )}
        </div>

        {schedule.length === 0 ? (
          <div className="px-5 py-8 text-center text-[12px] text-ink-400">
            No repayment schedule yet.
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {schedule.map((row) => {
              const totalDue = toNumber(row.total_due);
              const paid = toNumber(row.paid_amount);
              const penaltyDue = toNumber(row.penalty_due);
              const outstandingOnRow = Math.max(0, totalDue - paid) + penaltyDue;
              const isPaid = row.status === 'PAID';

              return (
                <div
                  key={row.id || row.installment_number}
                  className="px-5 py-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-plum-50 text-plum-700'
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          row.installment_number
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink-950">
                          Instalment {row.installment_number}
                        </p>
                        <p className="text-[11px] text-ink-400 mt-0.5">
                          Due {formatDate(row.due_date)}
                        </p>
                        {penaltyDue > 0 && (
                          <p className="text-[10px] text-red-700 mt-1 inline-flex items-center gap-1">
                            <AlertTriangle size={10} strokeWidth={2.6} />
                            Includes KES {formatKes(penaltyDue)} late fee
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-bold text-ink-950 tabular-nums">
                        KES {formatKes(outstandingOnRow)}
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] tabular-nums ${
                          isPaid ? 'text-emerald-700' : 'text-ink-400'
                        }`}
                      >
                        Paid KES {formatKes(paid)}
                      </p>
                      <span
                        className={`mt-1.5 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded-full ${instalmentStatusTone(
                          row.status
                        )}`}
                      >
                        {instalmentStatusLabel(row.status)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============ FOOTER ============ */}
      <div className="px-8 pb-8 pt-6 text-center">
        <p className="text-[10px] font-medium tracking-wide text-ink-400/80">
          IMARA CREDIT · {loan.currency}
        </p>
      </div>

      {/* ============ REPAY CTA ============ */}
      {canRepay && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-md px-4 py-3">
            <Link
              href={`/repay/${loan.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-plum-800 px-5 py-3.5 text-[14px] font-bold tracking-tight text-white transition active:scale-[0.985]"
            >
              Repay now
              <ArrowRight size={16} strokeWidth={2.6} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Breakdown row helper                                               */
/* ------------------------------------------------------------------ */
function BreakdownRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: 'bold' | 'red';
}) {
  const labelClass =
    emphasize === 'bold'
      ? 'text-[13px] font-semibold text-ink-950'
      : 'text-[12.5px] text-ink-500';
  const valueClass =
    emphasize === 'bold'
      ? 'text-[13px] font-bold text-ink-950 tabular-nums'
      : emphasize === 'red'
      ? 'text-[13px] font-bold text-red-700 tabular-nums'
      : 'text-[13px] font-semibold text-ink-900 tabular-nums';

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}