'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, Plus } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'DEFAULTED'
  | 'PAID'
  | 'REJECTED';

interface Loan {
  id: string;
  reference: string;
  status: LoanStatus;
  outstanding: number;
  principal: number;
  progress: number;
  dueDate?: string;
  submittedAt?: string;
  closedAt?: string;
  daysOverdue?: number;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const MOCK_LOANS: Loan[] = [
  {
    id: 'l1',
    reference: 'IL-2026-000142',
    status: 'ACTIVE',
    outstanding: 8500,
    principal: 20000,
    progress: 70,
    dueDate: '2026-10-15',
  },
  {
    id: 'l2',
    reference: 'IL-2026-000143',
    status: 'PENDING',
    outstanding: 0,
    principal: 5000,
    progress: 0,
    submittedAt: '2026-10-02',
  },
  {
    id: 'l3',
    reference: 'IL-2026-000139',
    status: 'OVERDUE',
    outstanding: 3200,
    principal: 6000,
    progress: 45,
    dueDate: '2026-09-28',
    daysOverdue: 4,
  },
  {
    id: 'l4',
    reference: 'IL-2026-000121',
    status: 'PAID',
    outstanding: 0,
    principal: 10000,
    progress: 100,
    closedAt: '2026-09-20',
  },
  {
    id: 'l5',
    reference: 'IL-2026-000118',
    status: 'REJECTED',
    outstanding: 0,
    principal: 15000,
    progress: 0,
    submittedAt: '2026-09-18',
    reason: 'Insufficient credit history',
  },
];

/* ------------------------------------------------------------------ */
/*  Display config                                                     */
/* ------------------------------------------------------------------ */
const STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DISBURSED: 'Disbursed',
  ACTIVE: 'Active',
  OVERDUE: 'Overdue',
  DEFAULTED: 'Defaulted',
  PAID: 'Paid',
  REJECTED: 'Rejected',
};

const STATUS_PILL: Record<LoanStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED:  'bg-sky-50 text-sky-700 border-sky-200',
  DISBURSED: 'bg-plum-50 text-plum-700 border-plum-200',
  ACTIVE:    'bg-plum-50 text-plum-700 border-plum-200',
  OVERDUE:   'bg-orange-50 text-orange-700 border-orange-200',
  DEFAULTED: 'bg-red-50 text-red-700 border-red-200',
  PAID:      'bg-leaf-50 text-leaf-700 border-leaf-200',
  REJECTED:  'bg-ink-100 text-ink-500 border-ink-200',
};

const STATUS_BAR: Record<LoanStatus, string> = {
  PENDING:   'bg-amber-400',
  APPROVED:  'bg-sky-500',
  DISBURSED: 'bg-plum-600',
  ACTIVE:    'bg-plum-700',
  OVERDUE:   'bg-orange-500',
  DEFAULTED: 'bg-red-500',
  PAID:      'bg-leaf-500',
  REJECTED:  'bg-ink-300',
};

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */
const TABS = [
  {
    id: 'all',
    label: 'All',
    match: (_l: Loan) => true,
  },
  {
    id: 'active',
    label: 'Active',
    match: (l: Loan) =>
      l.status === 'DISBURSED' || l.status === 'ACTIVE' || l.status === 'OVERDUE',
  },
  {
    id: 'history',
    label: 'History',
    match: (l: Loan) =>
      l.status === 'PAID' || l.status === 'REJECTED' || l.status === 'DEFAULTED',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatKES(n: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LoansPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('all');

  const activeTab = TABS.find((t) => t.id === tab)!;
  const visible = MOCK_LOANS.filter(activeTab.match);

  const hasAnyLoans = MOCK_LOANS.length > 0;

  return (
    <div className="min-h-screen bg-page pb-24">

      {/* ============ NAV — plum purple ============ */}
      <div className="sticky top-0 z-30 bg-plum-800">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              Your book
            </p>
            <h1 className="mt-0.5 text-[17px] font-semibold tracking-tight text-white">
              My loans
            </h1>
          </div>

          <button
            onClick={() => router.push('/apply/loan')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
            aria-label="New loan"
          >
            <Plus size={18} strokeWidth={2.6} />
          </button>
        </div>

        {/* Yellow accent line */}
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ TABS — purple, on white ============ */}
      <div className="sticky top-[73px] z-20 flex border-b border-ink-100 bg-white">
        {TABS.map((t) => {
          const isActive = t.id === tab;
          const count = MOCK_LOANS.filter(t.match).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-1 px-4 py-3 text-[12.5px] font-semibold tracking-tight transition ${
                isActive ? 'text-plum-700' : 'text-ink-400'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {t.label}
                <span
                  className={`inline-grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${
                    isActive
                      ? 'bg-plum-700 text-white'
                      : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {count}
                </span>
              </span>
              {isActive && (
                <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-plum-700" />
              )}
            </button>
          );
        })}
      </div>

      {/* ============ EMPTY STATE (no loans at all) ============ */}
      {!hasAnyLoans && (
        <div className="px-6 pt-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-plum-50 text-plum-700">
            <Plus size={26} strokeWidth={2.2} />
          </div>
          <h2 className="mt-5 text-[16px] font-bold tracking-tight text-ink-950">
            No loans yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[12.5px] leading-snug text-ink-500">
            Apply for your first loan and it will appear here.
          </p>
          <Link
            href="/apply/loan"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-plum-800 px-5 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
          >
            Apply for a loan
            <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      )}

      {/* ============ EMPTY STATE (this tab has none) ============ */}
      {hasAnyLoans && visible.length === 0 && (
        <div className="px-6 pt-14 text-center">
          <h2 className="text-[14px] font-semibold tracking-tight text-ink-800">
            Nothing here
          </h2>
          <p className="mx-auto mt-1 max-w-[16rem] text-[12px] leading-snug text-ink-500">
            No loans in {activeTab.label.toLowerCase()} yet.
          </p>
        </div>
      )}

      {/* ============ LOAN CARDS ============ */}
      {visible.length > 0 && (
        <div className="space-y-3 px-3 py-3">
          {visible.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loan card                                                          */
/* ------------------------------------------------------------------ */
function LoanCard({ loan }: { loan: Loan }) {
  const isInProgress =
    loan.status === 'ACTIVE' ||
    loan.status === 'OVERDUE' ||
    loan.status === 'DISBURSED';

  const isPending = loan.status === 'PENDING' || loan.status === 'APPROVED';

  const primaryAmount = isInProgress ? loan.outstanding : loan.principal;
  const primaryLabel = isInProgress ? 'Outstanding' : 'Loan amount';

  let subLine: React.ReactNode = null;
  if (loan.status === 'ACTIVE' && loan.dueDate) {
    subLine = (
      <>
        Next due <span className="font-semibold text-ink-800">{formatDate(loan.dueDate)}</span>
      </>
    );
  } else if (loan.status === 'OVERDUE' && loan.daysOverdue != null) {
    subLine = (
      <span className="font-semibold text-orange-700">
        {loan.daysOverdue} day{loan.daysOverdue === 1 ? '' : 's'} overdue
      </span>
    );
  } else if (isPending && loan.submittedAt) {
    subLine = (
      <>
        Submitted <span className="font-semibold text-ink-800">{formatDate(loan.submittedAt)}</span>
      </>
    );
  } else if (loan.status === 'PAID' && loan.closedAt) {
    subLine = (
      <>
        Closed <span className="font-semibold text-ink-800">{formatDate(loan.closedAt)}</span>
      </>
    );
  } else if (loan.status === 'REJECTED' && loan.reason) {
    subLine = <span className="text-ink-500">{loan.reason}</span>;
  }

  return (
    <Link
      href={`/loans/${loan.id}`}
      className="block overflow-hidden rounded-2xl bg-white transition active:scale-[0.995]"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            {primaryLabel}
          </p>
          <p className="mt-1 text-[22px] font-bold leading-none tracking-[-0.02em] text-ink-950 tabular-nums">
            {formatKES(primaryAmount)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-ink-400">
            {loan.reference}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_PILL[loan.status]}`}
        >
          {STATUS_LABELS[loan.status]}
        </span>
      </div>

      {/* progress bar */}
      {(isInProgress || loan.status === 'PAID') && loan.progress > 0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full transition-all ${STATUS_BAR[loan.status]}`}
              style={{ width: `${loan.progress}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-medium text-ink-400">
            <span>{loan.progress}% repaid</span>
            <span>of {formatKES(loan.principal)}</span>
          </div>
        </div>
      )}

      {/* sub-line + chevron */}
      {subLine && (
        <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-2.5">
          <p className="truncate text-[11.5px] text-ink-500">{subLine}</p>
          <ChevronRight
            size={14}
            className="shrink-0 text-ink-400"
            strokeWidth={2.2}
          />
        </div>
      )}
    </Link>
  );
}