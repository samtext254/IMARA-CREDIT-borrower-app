'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readDraft, writeDraft } from '@/lib/apply-draft';
import {
  validateLoanRequest,
  computeLoanQuote,
  PURPOSE_LABELS,
  formatKES,
  type LoanPurpose,
  type LoanTermDays,
} from '@/lib/lending-types';
import { ImaraApiError } from '@/lib/api';
import { loans as loansApi } from '@/lib/loans';
import type { Eligibility, LoanProduct } from '@/lib/loans';

/* ------------------------------------------------------------------ */
/*  Local UI helpers                                                   */
/* ------------------------------------------------------------------ */
function Req() {
  return <span className="ml-0.5 text-red-500">*</span>;
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
      {children}
      {required && <Req />}
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] font-medium text-red-600">{children}</p>;
}

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

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const DEFAULT_CREDIT_LIMIT = 10000;

/** Any loan in one of these statuses blocks a new application. */
const BLOCKING_STATUSES = [
  'PENDING',
  'APPROVED',
  'DISBURSED',
  'ACTIVE',
  'OVERDUE',
] as const;

const TERM_OPTIONS: LoanTermDays[] = [7, 14, 30, 60, 90];
const PURPOSE_OPTIONS: LoanPurpose[] = [
  'business_stock',
  'working_capital',
  'equipment',
  'emergency',
  'school_fees',
  'other',
];
const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

function blockingMessage(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'You already have an application under review.';
    case 'APPROVED':
      return 'You already have an approved loan awaiting disbursement.';
    case 'DISBURSED':
      return 'You already have a disbursed loan awaiting activation.';
    case 'ACTIVE':
      return 'You already have an active loan.';
    case 'OVERDUE':
      return 'You already have an overdue loan. Please clear it before applying again.';
    default:
      return 'You are not eligible for a new loan right now.';
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ApplyLoanPage() {
  const router = useRouter();

  const [product, setProduct] = useState<LoanProduct | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState<number>(0);
  const [amountInput, setAmountInput] = useState('');
  const [termDays, setTermDays] = useState<LoanTermDays>(30);
  const [purpose, setPurpose] = useState<LoanPurpose | null>(null);
  const [purposeNote, setPurposeNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);

  const amountRef = useRef<HTMLDivElement>(null);
  const purposeRef = useRef<HTMLDivElement>(null);
  const purposeNoteRef = useRef<HTMLInputElement>(null);

  // ─── Fetch product + eligibility + gating check ─────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [prodRes, eligRes, loansRes] = await Promise.all([
          loansApi.getProduct(),
          loansApi.getEligibility(),
          loansApi.getLoans({ limit: 20 }),
        ]);
        if (cancelled) return;

        // ─── Application gating ───────────────────────────────
        // Block the page if the borrower has any loan in flight.
        const blocking = (loansRes.data || []).find((l) =>
          (BLOCKING_STATUSES as readonly string[]).includes(l.status)
        );

        if (blocking) {
          setLoadError(blockingMessage(blocking.status));
          return;
        }

        setProduct(prodRes.data);
        setEligibility(eligRes.data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ImaraApiError) {
          setLoadError(err.message);
        } else {
          setLoadError('Could not load loan details.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Restore draft ──────────────────────────────────────────
  useEffect(() => {
    const draft = readDraft();
    const r = draft.request;
    if (!r) return;
    setAmount(r.amount ?? 0);
    setAmountInput(r.amount ? String(r.amount) : '');
    setTermDays(r.termDays ?? 30);
    setPurpose(r.purpose ?? null);
    setPurposeNote(r.purposeNote ?? '');
  }, []);

  // ─── Bounds ─────────────────────────────────────────────────
  const max = useMemo(() => {
    const available = eligibility?.credit_limit
      ? parseFloat(eligibility.credit_limit.available_limit || '0')
      : DEFAULT_CREDIT_LIMIT;
    const productMax = product
      ? parseFloat(product.max_amount || '0')
      : Infinity;
    return Math.min(available, productMax);
  }, [eligibility, product]);

  const clampedAmount = Math.min(Math.max(amount, 0), max);

  function applyAmountInput(raw: string) {
    const digits = raw.replace(/\D/g, '');
    setAmountInput(digits);
    const n = Number(digits) || 0;
    setAmount(Math.min(n, max));
  }

  function pickQuickAmount(v: number) {
    setAmount(v);
    setAmountInput(String(v));
  }

  const quote = useMemo(
    () => computeLoanQuote(clampedAmount, termDays),
    [clampedAmount, termDays]
  );

  const request = useMemo(
    () => ({
      amount: clampedAmount,
      termDays,
      purpose: purpose ?? undefined,
      purposeNote: purpose === 'other' ? purposeNote : undefined,
    }),
    [clampedAmount, termDays, purpose, purposeNote]
  );

  const validation = validateLoanRequest(request);
  const show = (f: string) => submitted && validation.missing.includes(f);

  function scrollToRef(ref: React.RefObject<HTMLElement | null>) {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function onContinue() {
    setSubmitted(true);
    setTopError(null);

    if (!validation.ok) {
      const first = validation.missing[0];
      const msg =
        first === 'amount'
          ? 'Enter a loan amount to continue'
          : first === 'termDays'
          ? 'Choose a term to continue'
          : first === 'purpose'
          ? 'Choose what the loan is for'
          : first === 'purposeNote'
          ? 'Tell us what the loan is for'
          : 'Please check the form';
      setTopError(msg);

      if (first === 'amount') scrollToRef(amountRef);
      else if (first === 'purpose') scrollToRef(purposeRef);
      else if (first === 'purposeNote') {
        scrollToRef(purposeNoteRef);
        setTimeout(() => purposeNoteRef.current?.focus(), 400);
      }
      return;
    }

    writeDraft({
      request: {
        amount: clampedAmount,
        termDays,
        purpose: purpose!,
        purposeNote: purpose === 'other' ? purposeNote.trim() : undefined,
      },
      productId: product?.id,
    });

    router.push('/apply');
  }

  const sliderPct = max > 0 ? (clampedAmount / max) * 100 : 0;

  // ─── Load error state ───────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="sticky top-0 z-30 border-b border-ink-100 bg-white">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => router.back()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100/70 text-ink-800 transition active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft size={17} strokeWidth={2.2} />
            </button>
            <h1 className="text-[15px] font-semibold tracking-tight text-ink-950">
              Loan request
            </h1>
          </div>
        </div>
        <div className="px-6 pt-12 text-center">
          <p className="text-[14px] font-semibold text-ink-800">
            Not available right now
          </p>
          <p className="mt-2 text-[12px] text-ink-500">{loadError}</p>
          <button
            onClick={() => router.push('/home')}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-plum-700 px-4 py-2 text-[12px] font-bold tracking-tight text-white transition active:scale-[0.985]"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-48">
      {/* NAV */}
      <div className="sticky top-0 z-30 border-b border-ink-100 bg-white">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100/70 text-ink-800 transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Step 1 of 4
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink-950">
              Loan request
            </h1>
          </div>
        </div>
        <div className="h-0.5 w-full bg-ink-100">
          <div className="h-full w-1/4 bg-brand-500 transition-all" />
        </div>
      </div>

      {/* INTRO */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] leading-snug text-ink-500">
          Choose how much you need. Your limit is{' '}
          <span className="font-semibold text-ink-900">{formatKES(max)}</span>.
        </p>
        <p className="mt-0.5 text-[10.5px] font-medium text-ink-400">
          Fields marked <span className="text-red-500">*</span> are required.
        </p>
      </div>

      {/* AMOUNT */}
      <SectionCard title="How much do you need?">
        <div ref={amountRef}>
          <div className="overflow-hidden rounded-2xl bg-brand-500 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
            <div className="px-4 pt-5 pb-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                You will receive
              </p>
              <p className="mt-2 text-[34px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
                {formatKES(quote.amount)}
              </p>
              <p className="mt-1.5 text-[10.5px] text-plum-800/60">
                Max {formatKES(max)}
              </p>
            </div>
            <div className="border-t border-plum-800/10 px-4 py-3">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-plum-800/70">
                  Interest ({quote.interestRatePct}% · {quote.termDays} days)
                </span>
                <span className="font-semibold tabular-nums">
                  {formatKES(quote.interestAmount)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-plum-800/90">
                  Total to repay
                </span>
                <span className="font-bold tabular-nums">
                  {formatKES(quote.totalRepayable)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="range"
              min={0}
              max={max}
              step={500}
              value={clampedAmount}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                setAmount(v);
                setAmountInput(String(v));
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-100"
              style={{
                background: `linear-gradient(to right, #5b2e8c 0%, #5b2e8c ${sliderPct}%, #f3f4f6 ${sliderPct}%, #f3f4f6 100%)`,
              }}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((v) => {
              const disabled = v > max;
              const active = clampedAmount === v;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickQuickAmount(v)}
                  className={`rounded-lg border py-2 text-[11.5px] font-semibold transition ${
                    disabled
                      ? 'cursor-not-allowed border-ink-100 bg-ink-100/50 text-ink-400'
                      : active
                      ? 'border-plum-700 bg-plum-50 text-plum-700'
                      : 'border-ink-100 bg-white text-ink-700 active:bg-ink-100/50'
                  }`}
                >
                  {v >= 1000 ? `${v / 1000}K` : String(v)}
                </button>
              );
            })}
          </div>

          <label className="mt-3 block">
            <FieldLabel>Or enter exact amount</FieldLabel>
            <Input
              className="mt-1"
              inputMode="numeric"
              placeholder={`Up to ${max}`}
              value={amountInput}
              onChange={(e) => applyAmountInput(e.target.value)}
            />
          </label>
        </div>

        {show('amount') && <FieldError>Enter a loan amount</FieldError>}
      </SectionCard>

      {/* TERM */}
      <SectionCard
        title="For how long?"
        subtitle="Your interest rate is set by the term you choose."
      >
        <div className="grid grid-cols-5 gap-1.5">
          {TERM_OPTIONS.map((t) => {
            const active = termDays === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTermDays(t)}
                className={`flex flex-col items-center gap-0.5 rounded-lg border py-2.5 transition ${
                  active
                    ? 'border-plum-700 bg-plum-50 text-plum-700'
                    : 'border-ink-100 bg-white text-ink-700 active:bg-ink-100/50'
                }`}
              >
                <span className="text-[13px] font-bold leading-none">{t}</span>
                <span className="text-[9px] font-medium uppercase tracking-wider">
                  days
                </span>
              </button>
            );
          })}
        </div>
        {show('termDays') && <FieldError>Choose a term</FieldError>}
      </SectionCard>

      {/* PURPOSE */}
      <SectionCard title="What is it for?">
        <div ref={purposeRef} className="space-y-1.5">
          {PURPOSE_OPTIONS.map((p) => {
            const active = purpose === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPurpose(p);
                  setTopError(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                  active
                    ? 'border-plum-700 bg-plum-50'
                    : show('purpose')
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-ink-100 bg-white active:bg-ink-100/50'
                }`}
              >
                <span
                  className={`text-[13px] font-semibold ${
                    active ? 'text-plum-700' : 'text-ink-800'
                  }`}
                >
                  {PURPOSE_LABELS[p]}
                </span>
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full border ${
                    active
                      ? 'border-plum-700 bg-plum-700 text-white'
                      : 'border-ink-400 bg-white'
                  }`}
                >
                  {active && <Check size={10} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        {purpose === 'other' && (
          <label className="mt-3 block">
            <FieldLabel required>Please specify</FieldLabel>
            <Input
              ref={purposeNoteRef}
              className="mt-1"
              placeholder="e.g. Rent for the shop"
              value={purposeNote}
              onChange={(e) => setPurposeNote(e.target.value)}
            />
            {show('purposeNote') && (
              <FieldError>Tell us what the loan is for</FieldError>
            )}
          </label>
        )}

        {show('purpose') && <FieldError>Choose a purpose</FieldError>}

        <div aria-hidden className="h-6" />
      </SectionCard>

      {/* STICKY CTA */}
      <div className="fixed bottom-14 left-1/2 z-20 w-full max-w-[28rem] -translate-x-1/2 border-t border-ink-100 bg-white/95 backdrop-blur-md">
        {topError && (
          <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-[11px] font-medium text-red-700">
            {topError}
          </div>
        )}
        <div className="px-4 py-2.5">
          <Button type="button" onClick={onContinue} className="w-full" size="md">
            Continue
            <ArrowRight size={15} strokeWidth={2.5} className="ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}