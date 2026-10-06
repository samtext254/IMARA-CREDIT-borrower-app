'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readDraft, writeDraft } from '@/lib/apply-draft';
import {
  validateDisbursement,
  normalizeKenyanPhone,
} from '@/lib/lending-types';

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
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );
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

export default function ApplyConfirmPage() {
  const router = useRouter();

  const loginPhone = '+254712345678';

  const [mpesaNumber, setMpesaNumber] = useState(loginPhone);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const draft = readDraft();
    const d = draft.disbursement;
    if (d?.mpesaNumber) setMpesaNumber(d.mpesaNumber);
    if (d?.confirmed) setConfirmed(d.confirmed);
  }, []);

  const normalized = normalizeKenyanPhone(mpesaNumber);
  const sameAsLogin = normalized === loginPhone;
  const validation = validateDisbursement({
    mpesaNumber: normalized ?? '',
    confirmed,
  });
  const show = (f: string) =>
    (submitted && validation.missing.includes(f)) ||
    (f === 'mpesaNumber' && !!error);

  function onContinue() {
    setSubmitted(true);
    setError(null);

    if (!normalized) {
      setError('Enter a valid M-Pesa number');
      return;
    }

    if (!validation.ok) {
      const first = validation.missing[0];
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    writeDraft({
      disbursement: {
        mpesaNumber: normalized,
        confirmed: true,
      },
    });

    router.push('/apply/review'); // Step 4
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
              Step 3 of 4
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink-950">
              Disbursement
            </h1>
          </div>
        </div>
        <div className="h-0.5 w-full bg-ink-100">
          {/* progress bar — yellow */}
          <div className="h-full w-3/4 bg-brand-500 transition-all" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] leading-snug text-ink-500">
          Funds will be sent to your M-Pesa. Confirm the number below.
        </p>
      </div>

      <SectionCard title="M-Pesa number">
        <div data-field="mpesaNumber">
          <FieldLabel required>Number</FieldLabel>
          <div className="relative mt-1">
            <Phone
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <Input
              className="pl-9"
              inputMode="tel"
              placeholder="07XX XXX XXX"
              value={mpesaNumber}
              onChange={(e) => {
                setError(null);
                setMpesaNumber(e.target.value);
              }}
            />
          </div>
          {sameAsLogin && normalized && (
            <p className="mt-1 text-[10.5px] font-medium text-leaf-600">
              Same as your login number
            </p>
          )}
          {show('mpesaNumber') && (
            <p className="mt-1 text-[11px] font-medium text-red-600">
              {error ?? 'Enter your M-Pesa number'}
            </p>
          )}
        </div>

        <button
          type="button"
          data-field="confirmed"
          onClick={() => setConfirmed((v) => !v)}
          className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
            confirmed
              ? 'border-plum-700 bg-plum-50'
              : show('confirmed')
              ? 'border-red-300 bg-red-50/50'
              : 'border-ink-100 bg-white'
          }`}
        >
          <span
            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${
              confirmed
                ? 'border-plum-700 bg-plum-700 text-white'
                : 'border-ink-400 bg-white'
            }`}
          >
            {confirmed && (
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5">
                <path
                  d="M2 6l3 3 5-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className="text-[12px] leading-snug text-ink-800">
            I confirm this M-Pesa number is correct and belongs to me.
          </span>
        </button>

        {show('confirmed') && (
          <p className="text-[11px] font-medium text-red-600">
            Please confirm the number
          </p>
        )}
      </SectionCard>

      <div className="fixed bottom-14 left-1/2 z-20 w-full max-w-[28rem] -translate-x-1/2 border-t border-ink-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <Button type="button" onClick={onContinue} className="w-full" size="md">
          Continue
          <ArrowRight size={15} strokeWidth={2.5} className="ml-1.5" />
        </Button>
      </div>
    </div>
  );
}