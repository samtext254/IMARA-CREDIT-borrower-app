'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readDraft, clearDraft } from '@/lib/apply-draft';
import {
  computeLoanQuote,
  formatKES,
  PURPOSE_LABELS,
  type LoanApplicationDraft,
} from '@/lib/lending-types';

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white">
      <div className="border-b border-ink-100 px-4 py-3">
        <h2 className="text-[13px] font-bold tracking-tight text-ink-950">
          {title}
        </h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-[12px] text-ink-500">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-ink-950">
        {value}
      </span>
    </div>
  );
}

export default function ApplyReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Partial<LoanApplicationDraft>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
  }, []);

  const quote = useMemo(() => {
    const amt = draft.request?.amount ?? 0;
    const term = draft.request?.termDays ?? 30;
    return computeLoanQuote(amt, term);
  }, [draft]);

  const signatureOk =
    signature.trim().length > 2 &&
    (!draft.kyc?.fullName ||
      signature.trim().toLowerCase() === draft.kyc.fullName.toLowerCase());

  const canSubmit = termsAccepted && signatureOk;

  const show = (f: string) => submitted && (
    (f === 'terms' && !termsAccepted) ||
    (f === 'signature' && !signatureOk)
  );

  function onSubmit() {
    setSubmitted(true);
    if (!canSubmit) return;

    setBusy(true);
    // TODO: POST /api/lending/loans with draft
    setTimeout(() => {
      clearDraft();
      router.push('/apply-done');
    }, 900);
  }

  return (
    <div className="min-h-screen bg-page pb-28">
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
              Step 4 of 4
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink-950">
              Review & sign
            </h1>
          </div>
        </div>
        <div className="h-0.5 w-full bg-ink-100">
          {/* progress bar — yellow, full */}
          <div className="h-full w-full bg-brand-500 transition-all" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] leading-snug text-ink-500">
          Please check the details below before submitting.
        </p>
      </div>

      {/* LOAN SUMMARY */}
      <SectionCard title="Loan summary">
        {/* Yellow summary card with purple text */}
        <div className="overflow-hidden rounded-2xl bg-brand-500 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
          <div className="px-4 pt-4 pb-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
              You will receive
            </p>
            <p className="mt-1.5 text-[30px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
              {formatKES(quote.amount)}
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

        <div className="mt-3 divide-y divide-ink-100">
          <Row
            label="Purpose"
            value={
              draft.request?.purpose
                ? PURPOSE_LABELS[draft.request.purpose]
                : '—'
            }
          />
          {draft.request?.purposeNote && (
            <Row label="Note" value={draft.request.purposeNote} />
          )}
          <Row label="Term" value={`${quote.termDays} days`} />
          <Row
            label="M-Pesa"
            value={draft.disbursement?.mpesaNumber ?? '—'}
          />
        </div>
      </SectionCard>

      {/* BORROWER */}
      <SectionCard title="Your details">
        <div className="divide-y divide-ink-100">
          <Row label="Name" value={draft.kyc?.fullName ?? '—'} />
          <Row label="National ID" value={draft.kyc?.nationalId ?? '—'} />
          <Row label="Email" value={draft.kyc?.email ?? '—'} />
          {draft.kyc?.isBusiness && draft.kyc.businessInfo && (
            <>
              <Row label="Business" value={draft.kyc.businessInfo.name} />
              <Row label="KRA PIN" value={draft.kyc.businessInfo.kraPin} />
            </>
          )}
        </div>
      </SectionCard>

      {/* AGREEMENT */}
      <SectionCard title="Agreement">
        <button
          type="button"
          onClick={() => setTermsAccepted((v) => !v)}
          className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
            termsAccepted
              ? 'border-plum-700 bg-plum-50'
              : show('terms')
              ? 'border-red-300 bg-red-50/50'
              : 'border-ink-100 bg-white'
          }`}
        >
          <span
            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
              termsAccepted
                ? 'border-plum-700 bg-plum-700 text-white'
                : 'border-ink-400 bg-white'
            }`}
          >
            {termsAccepted && <Check size={10} strokeWidth={3} />}
          </span>
          <span className="text-[12px] leading-snug text-ink-800">
            I accept the Terms &amp; Conditions and confirm all details above
            are correct.
          </span>
        </button>
        {show('terms') && (
          <p className="mt-1 text-[11px] font-medium text-red-600">
            Please accept the terms
          </p>
        )}

        <div className="mt-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Sign by typing your full name
            <span className="ml-0.5 text-red-500">*</span>
          </span>
          <Input
            className={`mt-1 ${
              show('signature') ? 'border-red-400 ring-2 ring-red-100' : ''
            }`}
            placeholder="Type your full name"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
          />
          {show('signature') && (
            <p className="mt-1 text-[11px] font-medium text-red-600">
              {signature.trim().length <= 2
                ? 'Type your full name to sign'
                : 'Name must match the one you entered earlier'}
            </p>
          )}
        </div>
      </SectionCard>

      <div className="fixed bottom-14 left-1/2 z-20 w-full max-w-[28rem] -translate-x-1/2 border-t border-ink-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="w-full"
          size="md"
        >
          {busy ? 'Submitting…' : 'Submit application'}
        </Button>
      </div>
    </div>
  );
}