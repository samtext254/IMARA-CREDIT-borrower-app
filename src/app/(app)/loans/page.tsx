'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronRight,
  Receipt,
  WalletCards,
} from 'lucide-react';
import { ImaraApiError } from '@/lib/api';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { Loan, LoanStatus } from '@/lib/loans';

function formatKes(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
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

const STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Declined',
  DISBURSED: 'Disbursed',
  ACTIVE: 'Active',
  OVERDUE: 'Overdue',
  PAID: 'Repaid',
  DEFAULTED: 'Defaulted',
  WRITTEN_OFF: 'Written off',
};

const STATUS_STYLES: Record<LoanStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-ink-100/60', text: 'text-ink-700' },
  APPROVED: { bg: 'bg-leaf-50', text: 'text-leaf-700' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700' },
  DISBURSED: { bg: 'bg-leaf-50', text: 'text-leaf-700' },
  ACTIVE: { bg: 'bg-leaf-50', text: 'text-leaf-700' },
  OVERDUE: { bg: 'bg-amber-50', text: 'text-amber-700' },
  PAID: { bg: 'bg-plum-50', text: 'text-plum-700' },
  DEFAULTED: { bg: 'bg-red-50', text: 'text-red-700' },
  WRITTEN_OFF: { bg: 'bg-red-50', text: 'text-red-700' },
};

export default function LoansPage() {
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await loansApi.getLoans({ limit: 50 });
        if (cancelled) return;
        setAllLoans(res.data || []);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ImaraApiError) {
          setError(err.message);
        } else {
          setError('Could not load your loans. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { activeLoan, pastLoans, pendingLoans } = useMemo(() => {
    const active = allLoans.filter(
      (l) =>
        l.status === 'ACTIVE' ||
        l.status === 'OVERDUE' ||
        l.status === 'DISBURSED'
    );
    const pending = allLoans.filter((l) => l.status === 'PENDING');
    const past = allLoans.filter(
      (l) =>
        l.status === 'PAID' ||
        l.status === 'REJECTED' ||
        l.status === 'DEFAULTED' ||
        l.status === 'WRITTEN_OFF'
    );
    return {
      activeLoan: active[0] || null,
      pastLoans: past,
      pendingLoans: pending,
    };
  }, [allLoans]);

  const hasActive = activeLoan !== null;
  const hasPending = pendingLoans.length > 0;
  const hasAny = allLoans.length > 0;
  const canApply = !hasActive && !hasPending;

  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <div className="sticky top-0 z-30 bg-plum-700">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="h-6 w-24 animate-pulse rounded bg-white/10" />
          </div>
        </div>
        <div className="px-3 pt-3 space-y-3">
          <div className="h-32 animate-pulse rounded-3xl bg-ink-100/40" />
          <div className="h-20 animate-pulse rounded-2xl bg-ink-100/40" />
          <div className="h-20 animate-pulse rounded-2xl bg-ink-100/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* ============ NAV ============ */}
      <div className="sticky top-0 z-30 bg-plum-700">
        <div className="flex items-center gap-3 px-5 py-4">
          <h1 className="text-[16px] font-semibold tracking-tight text-white">
            My Loans
          </h1>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ EMPTY STATE ============ */}
      {!hasAny && !error && (
        <div className="px-3 pt-3">
          <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 pt-5 pb-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                  No loans yet
                </p>
                <p className="mt-2 text-[20px] font-bold leading-tight tracking-tight text-plum-800">
                  Apply for your first loan
                </p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-plum-800/10 text-plum-800">
                <WalletCards size={19} strokeWidth={2.2} />
              </div>
            </div>

            <Link
              href="/apply/loan"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
            >
              Apply for a loan
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}

      {/* ============ ERROR STATE ============ */}
      {error && (
        <div className="px-3 pt-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-medium text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* ============ PENDING LOANS ============ */}
      {pendingLoans.length > 0 && (
        <section className="mt-3 bg-white">
          <div className="flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Under review
            </h2>
            <span className="text-[11px] font-semibold text-ink-500">
              {pendingLoans.length}
            </span>
          </div>

          {pendingLoans.map((loan, idx) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              isLast={idx === pendingLoans.length - 1}
            />
          ))}
        </section>
      )}

      {/* ============ ACTIVE LOAN ============ */}
      {activeLoan && (
        <section className="mt-3 bg-white">
          <div className="flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Active loan
            </h2>
          </div>

          <Link
            href={`/loans/${activeLoan.id}`}
            className="block px-5 py-4 transition active:bg-ink-100/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      STATUS_STYLES[activeLoan.status].bg
                    } ${STATUS_STYLES[activeLoan.status].text}`}
                  >
                    {STATUS_LABELS[activeLoan.status]}
                  </span>
                  <span className="text-[10.5px] font-medium text-ink-400">
                    {activeLoan.loan_reference}
                  </span>
                </div>
                <p className="mt-2 text-[20px] font-bold leading-none tracking-tight text-ink-950 tabular-nums">
                  KES {formatKes(activeLoan.outstanding_total)}
                </p>
                <p className="mt-1 text-[11px] font-medium text-ink-400">
                  of KES {formatKes(activeLoan.principal_amount)} principal
                </p>
              </div>
              <ChevronRight
                size={18}
                className="shrink-0 text-ink-400"
                strokeWidth={2.2}
              />
            </div>

            <div className="mt-4 flex items-center gap-3 border-t border-ink-100 pt-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Due
                </p>
                <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink-800">
                  {formatDate(loanDueDate(activeLoan))}
                </p>
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Outstanding
                </p>
                <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink-800 tabular-nums">
                  KES {formatKes(activeLoan.outstanding_total)}
                </p>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ============ PAST LOANS ============ */}
      {pastLoans.length > 0 && (
        <section className="mt-3 bg-white">
          <div className="flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              History
            </h2>
            <span className="text-[11px] font-semibold text-ink-500">
              {pastLoans.length}
            </span>
          </div>

          {pastLoans.map((loan, idx) => (
            <LoanRow
              key={loan.id}
              loan={loan}
              isLast={idx === pastLoans.length - 1}
            />
          ))}
        </section>
      )}

      {/* ============ APPLY CTA ============ */}
      {canApply && hasAny && (
        <div className="px-3 pt-3">
          <Link
            href="/apply/loan"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3.5 text-[14px] font-bold tracking-tight text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)] transition active:scale-[0.985]"
          >
            Apply for a new loan
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loan row                                                           */
/* ------------------------------------------------------------------ */
function LoanRow({ loan, isLast }: { loan: Loan; isLast: boolean }) {
  const style = STATUS_STYLES[loan.status];
  const label = STATUS_LABELS[loan.status];

  const isCredit =
    loan.status === 'DISBURSED' ||
    loan.status === 'ACTIVE' ||
    loan.status === 'APPROVED' ||
    loan.status === 'PAID';

  const amount =
    loan.outstanding_total && Number(loan.outstanding_total) > 0
      ? loan.outstanding_total
      : loan.principal_amount;

  const dateSource =
    loan.disbursed_at || loan.closed_at || loan.created_at;

  return (
    <Link
      href={`/loans/${loan.id}`}
      className={`flex items-center gap-3.5 px-5 py-3.5 transition active:bg-ink-100/40 ${
        isLast ? '' : 'border-b border-ink-100'
      }`}
    >
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
          isCredit ? 'bg-leaf-50 text-leaf-600' : style.bg + ' ' + style.text
        }`}
      >
        <Receipt size={18} strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
          >
            {label}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] font-medium text-ink-400">
          {formatDate(dateSource)} · {loan.term_days} days
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[13.5px] font-bold tabular-nums tracking-tight text-ink-950">
          KES {formatKes(amount)}
        </p>
        <p className="mt-0.5 text-[10px] font-medium text-ink-400">
          of {formatKes(loan.principal_amount)}
        </p>
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 text-ink-300"
        strokeWidth={2}
      />
    </Link>
  );
}