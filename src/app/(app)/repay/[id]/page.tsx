'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Smartphone,
  AlertCircle,
  X,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImaraApiError } from '@/lib/api';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { Loan, LoanScheduleEntry } from '@/lib/loans';

/* ------------------------------------------------------------------ */
/*  Phone normalizer                                                   */
/* ------------------------------------------------------------------ */
// Duplicated locally so we do not depend on lending-types.
// Formats: 07XXXXXXXX, 7XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX → 254XXXXXXXXX
function normalizeKenyanPhone(input: string | null | undefined): string | null {
  const cleaned = String(input || '').replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `254${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('7') && cleaned.length === 9) {
    return `254${cleaned}`;
  }
  if (cleaned.startsWith('1') && cleaned.length === 9) {
    return `254${cleaned}`;
  }
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }
  return null;
}

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

/* ------------------------------------------------------------------ */
/*  Local components                                                   */
/* ------------------------------------------------------------------ */
function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white">
      <div className="border-b border-ink-100 px-4 py-3">
        <h2 className="text-[13px] font-bold tracking-tight text-ink-950">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-[10.5px] leading-snug text-ink-400">
            {subtitle}
          </p>
        )}
      </div>
      <div className="space-y-3 px-4 py-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
      {children}
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] font-medium text-red-600">{children}</p>;
}

const PAYBILL_NUMBER = '4049263';
const PAYBILL_ACCOUNT = '250084';

function PaybillSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-[28rem] rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-ink-200" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Alternative payment
            </p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-tight text-ink-950">
              Pay with Paybill
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100/70 text-ink-700 transition active:scale-95"
            aria-label="Close"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 pb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              How to pay
            </p>
            <ol className="mt-3 space-y-3">
              {[
                'Open M-Pesa on your phone',
                'Select Lipa na M-Pesa → Pay Bill',
                `Enter Business Number: ${PAYBILL_NUMBER}`,
                `Enter Account Number: ${PAYBILL_ACCOUNT}`,
                'Enter amount and your M-Pesa PIN',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-plum-50 text-[11px] font-bold text-plum-700">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[12.5px] leading-snug text-ink-700">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-5 text-center text-[10.5px] leading-snug text-ink-400">
            Your repayment will be applied automatically within a minute of
            the M-Pesa confirmation SMS.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function RepayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const loanId = params?.id ?? '';

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<LoanScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stkSent, setStkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaybill, setShowPaybill] = useState(false);

  // ─── Fetch the loan on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!loanId) {
        setLoadError('Missing loan ID.');
        setLoading(false);
        return;
      }

      try {
        const res = await loansApi.getLoan(loanId);
        if (cancelled) return;
        setLoan(res.data.loan);
        setSchedule(res.data.schedule || []);

        // Pre-fill the amount with the outstanding balance.
        const outstanding = parseFloat(
          res.data.loan.outstanding_total || '0'
        );
        if (outstanding > 0) {
          setAmountInput(String(Math.round(outstanding)));
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ImaraApiError) {
          if (err.code === 'NOT_FOUND') {
            setLoadError('This loan could not be found.');
          } else {
            setLoadError(err.message);
          }
        } else {
          setLoadError('Could not load loan details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loanId]);

  const outstanding = useMemo(() => {
    if (!loan) return 0;
    return parseFloat(loan.outstanding_total || '0');
  }, [loan]);

  const normalizedPhone = useMemo(() => normalizeKenyanPhone(phone), [phone]);

  const amount = useMemo(() => {
    const n = Number(amountInput.replace(/\D/g, '')) || 0;
    return Math.min(n, outstanding);
  }, [amountInput, outstanding]);

  const phoneError = submitted && !normalizedPhone;
  const amountError =
    submitted && (amount <= 0 || amount > outstanding);

  async function onRequestStk() {
    setSubmitted(true);
    setError(null);

    if (!normalizedPhone) {
      setError('Enter a valid M-Pesa number');
      return;
    }
    if (amount <= 0 || amount > outstanding) {
      setError('Enter a valid amount');
      return;
    }
    if (!loan) {
      setError('Loan not loaded');
      return;
    }

    setBusy(true);
    try {
      await loansApi.repay(loan.id, {
        amount: Math.round(amount),
        phone_number: normalizedPhone,
      });
      setStkSent(true);
    } catch (err) {
      if (err instanceof ImaraApiError) {
        switch (err.code) {
          case 'INVALID_STATE':
            setError(
              `This loan cannot be repaid right now (status: ${loan.status}).`
            );
            break;
          case 'NOT_FOUND':
            setError('Loan not found.');
            break;
          case 'INVALID_AMOUNT':
          case 'INVALID_REQUEST':
            setError(err.message || 'Enter a valid amount.');
            break;
          default:
            setError(err.message || 'Could not process the repayment.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  // ─── Loading / error state ─────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <div className="sticky top-0 z-30 bg-plum-800">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-1 w-full bg-brand-500" />
        </div>
        <div className="px-3 pt-3">
          <div className="h-56 animate-pulse rounded-2xl bg-ink-100/40" />
        </div>
      </div>
    );
  }

  if (loadError || !loan) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="sticky top-0 z-30 bg-plum-800">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => router.back()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft size={17} strokeWidth={2.2} />
            </button>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">
              Repayment
            </h1>
          </div>
          <div className="h-1 w-full bg-brand-500" />
        </div>

        <div className="px-6 pt-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink-100/60 text-ink-400">
            <AlertCircle size={24} strokeWidth={2} />
          </div>
          <p className="mt-4 text-[14px] font-semibold text-ink-800">
            Not available
          </p>
          <p className="mt-2 text-[12px] text-ink-500">
            {loadError || 'Loan not found.'}
          </p>
        </div>
      </div>
    );
  }

  // Repayment only makes sense for an active or overdue loan.
  const repayable =
    loan.status === 'ACTIVE' ||
    loan.status === 'OVERDUE' ||
    loan.status === 'DISBURSED';

  const displayReference = loan.loan_reference;
  const dueDate = loanDueDate(loan);

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* ============ NAV ============ */}
      <div className="sticky top-0 z-30 bg-plum-800">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
              Repayment
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
              Pay {displayReference}
            </h1>
          </div>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ SUMMARY CARD ============ */}
      <div className="px-3 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Outstanding balance
          </p>
          <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink-950 tabular-nums">
            KES {formatKes(loan.outstanding_total)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-ink-400">
            Due {formatDate(dueDate)}
          </p>
        </div>
      </div>

      {!repayable && (
        <div className="px-3 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
            This loan cannot be repaid right now (status: {loan.status}).
          </div>
        </div>
      )}

      {repayable && (
        <div className="pt-3">
          <SectionCard title="Pay with M-Pesa">
            <label className="block">
              <FieldLabel>M-Pesa number</FieldLabel>
              <div className="relative mt-1">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <Input
                  className="pl-9"
                  inputMode="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => {
                    setError(null);
                    setPhone(e.target.value);
                  }}
                />
              </div>
              {phoneError && (
                <FieldError>Enter a valid M-Pesa number</FieldError>
              )}
            </label>

            <label className="block">
              <FieldLabel>Amount</FieldLabel>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-400">
                  KES
                </span>
                <Input
                  className="pl-12"
                  inputMode="numeric"
                  placeholder={String(Math.round(outstanding))}
                  value={amountInput}
                  onChange={(e) => {
                    setError(null);
                    setAmountInput(e.target.value.replace(/\D/g, ''));
                  }}
                />
              </div>
              {amountError && (
                <FieldError>
                  {amount <= 0
                    ? 'Enter an amount'
                    : `Maximum is KES ${formatKes(outstanding)}`}
                </FieldError>
              )}
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5">
                <AlertCircle
                  size={14}
                  className="mt-0.5 shrink-0 text-red-600"
                  strokeWidth={2.4}
                />
                <p className="text-[11.5px] font-medium text-red-700">
                  {error}
                </p>
              </div>
            )}

            {stkSent && (
              <div className="flex items-start gap-2 rounded-xl border border-leaf-200 bg-leaf-50 px-3.5 py-3">
                <Smartphone
                  size={15}
                  className="mt-0.5 shrink-0 text-leaf-600"
                  strokeWidth={2.4}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-leaf-800">
                    Check your phone
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-leaf-700">
                    We sent an M-Pesa request for KES {formatKes(amount)} to{' '}
                    {normalizedPhone}. Enter your PIN to complete.
                  </p>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={onRequestStk}
              disabled={busy}
              className="w-full"
              size="md"
            >
              {busy ? 'Sending…' : 'Send M-Pesa request'}
            </Button>
          </SectionCard>
        </div>
      )}

      {/* ============ PAYBILL ============ */}
      {repayable && (
        <button
          type="button"
          onClick={() => setShowPaybill(true)}
          className="mt-3 flex w-full items-center gap-3.5 border-b border-ink-100 bg-white px-5 py-4 text-left transition active:bg-ink-100/40"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-50 text-plum-700">
            <HelpCircle size={17} strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold tracking-tight text-ink-950">
              Having trouble?
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-400">
              Pay with Paybill instead
            </p>
          </div>

          <ChevronRight
            size={16}
            className="shrink-0 text-ink-400"
            strokeWidth={2.2}
          />
        </button>
      )}

      <div className="px-8 pb-6 pt-4 text-center">
        <p className="text-[10px] font-medium tracking-wide text-ink-400/80">
          Trouble paying? Contact support from your profile.
        </p>
      </div>

      <PaybillSheet
        open={showPaybill}
        onClose={() => setShowPaybill(false)}
      />
    </div>
  );
}