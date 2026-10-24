'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Home, Shield, Compass, FileText, HelpCircle, LogOut, X, Menu } from 'lucide-react';
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

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {children}
      {required && <Req />}
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs font-medium text-red-600">{children}</p>;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const DEFAULT_CREDIT_LIMIT = 10000;
const BLOCKING_STATUSES = ['PENDING', 'APPROVED', 'DISBURSED', 'ACTIVE', 'OVERDUE'] as const;
const TERM_OPTIONS: LoanTermDays[] = [7, 14, 30, 60, 90];
const PURPOSE_OPTIONS: LoanPurpose[] = ['business_stock', 'working_capital', 'equipment', 'emergency', 'school_fees', 'other'];
const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

function blockingMessage(status: string): string {
  switch (status) {
    case 'PENDING': return 'You already have an application under review.';
    case 'APPROVED': return 'You already have an approved loan awaiting disbursement.';
    case 'DISBURSED': return 'You already have a disbursed loan awaiting activation.';
    case 'ACTIVE': return 'You already have an active loan.';
    case 'OVERDUE': return 'You already have an overdue loan. Please clear it before applying again.';
    default: return 'You are not eligible for a new loan right now.';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        if (err instanceof ImaraApiError) setLoadError(err.message);
        else setLoadError('Could not load loan details.');
      }
    })();

    return () => { cancelled = true; };
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
    const productMax = product ? parseFloat(product.max_amount || '0') : Infinity;
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
        first === 'amount' ? 'Enter a loan amount to continue'
          : first === 'termDays' ? 'Choose a term to continue'
          : first === 'purpose' ? 'Choose what the loan is for'
          : first === 'purposeNote' ? 'Tell us what the loan is for'
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
      <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F6F8] font-sans text-slate-800">
        {/* Reuse Sidebar Layout for Error State */}
        <aside className="hidden w-64 flex-col bg-[#0077C8] text-white md:flex shrink-0">
          <div className="flex h-24 items-center px-8">
            <button onClick={() => router.push('/dashboard')} className="leading-tight text-left">
              <h1 className="text-3xl font-bold tracking-tight text-white">Imara</h1>
              <p className="text-[10px] font-medium text-white/80">With you every step of the way</p>
            </button>
          </div>
        </aside>
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/50">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Shield size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Not available right now</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{loadError}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#0077C8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0060a3]"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* TOP NAVBAR */}
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1 of 4</p>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Loan Request</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF8A65] text-sm font-bold text-white ring-2 ring-white">
              SC
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
          
          <div className="mx-auto max-w-[1200px] p-4 sm:p-8">
            
            <div className="mb-6">
              <p className="text-sm text-slate-500">
                Choose how much you need. Your limit is <span className="font-bold text-slate-900">{formatKES(max)}</span>.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Fields marked <span className="text-red-500">*</span> are required.
              </p>
            </div>

            {/* THE DESKTOP GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
              
              {/* LEFT COLUMN: FORMS */}
              <div className="space-y-6">
                
                {/* AMOUNT FORM */}
                <div ref={amountRef} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">How much do you need?</h3>
                  
                  <label className="block">
                    <FieldLabel>Or enter exact amount</FieldLabel>
                    <Input
                      className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-base font-semibold focus-visible:ring-[#0077C8]/40"
                      inputMode="numeric"
                      placeholder={`Up to ${max}`}
                      value={amountInput}
                      onChange={(e) => applyAmountInput(e.target.value)}
                    />
                  </label>
                  {show('amount') && <FieldError>Enter a loan amount</FieldError>}

                  <div className="mt-5">
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
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-100"
                      style={{
                        background: `linear-gradient(to right, #0077C8 0%, #0077C8 ${sliderPct}%, #F1F5F9 ${sliderPct}%, #F1F5F9 100%)`,
                      }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-3">
                    {QUICK_AMOUNTS.map((v) => {
                      const disabled = v > max;
                      const active = clampedAmount === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={disabled}
                          onClick={() => pickQuickAmount(v)}
                          className={`rounded-lg border py-2.5 text-sm font-bold transition ${
                            disabled
                              ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                              : active
                              ? 'border-[#0077C8] bg-blue-50 text-[#0077C8]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {v >= 1000 ? `${v / 1000}K` : String(v)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TERM FORM */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-1 text-lg font-bold text-slate-900">For how long?</h3>
                  <p className="mb-4 text-xs text-slate-500">Your interest rate is set by the term you choose.</p>
                  
                  <div className="grid grid-cols-5 gap-2">
                    {TERM_OPTIONS.map((t) => {
                      const active = termDays === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTermDays(t)}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-3 transition ${
                            active
                              ? 'border-[#0077C8] bg-blue-50 text-[#0077C8]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-lg font-extrabold leading-none">{t}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">days</span>
                        </button>
                      );
                    })}
                  </div>
                  {show('termDays') && <FieldError>Choose a term</FieldError>}
                </div>

                {/* PURPOSE FORM */}
                <div ref={purposeRef} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">What is it for?</h3>
                  
                  <div className="space-y-2">
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
                          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                            active
                              ? 'border-[#0077C8] bg-blue-50'
                              : show('purpose')
                              ? 'border-red-300 bg-red-50/30'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className={`text-sm font-bold ${active ? 'text-[#0077C8]' : 'text-slate-700'}`}>
                            {PURPOSE_LABELS[p]}
                          </span>
                          <span className={`grid h-5 w-5 place-items-center rounded-full border ${
                            active ? 'border-[#0077C8] bg-[#0077C8] text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {active && <Check size={12} strokeWidth={3} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {purpose === 'other' && (
                    <label className="mt-4 block">
                      <FieldLabel required>Please specify</FieldLabel>
                      <Input
                        ref={purposeNoteRef}
                        className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                        placeholder="e.g. Rent for the shop"
                        value={purposeNote}
                        onChange={(e) => setPurposeNote(e.target.value)}
                      />
                      {show('purposeNote') && <FieldError>Tell us what the loan is for</FieldError>}
                    </label>
                  )}
                  {show('purpose') && <FieldError>Choose a purpose</FieldError>}
                </div>

              </div>

              {/* RIGHT COLUMN: SUMMARY (Sticky on Desktop) */}
              <div className="lg:sticky lg:top-6 h-fit space-y-6">
                
                <div className="overflow-hidden rounded-2xl bg-[#0077C8] text-white shadow-lg">
                  <div className="px-6 pt-8 pb-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-200">You will receive</p>
                    <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">
                      {formatKES(quote.amount)}
                    </p>
                    <p className="mt-2 text-xs font-medium text-blue-200">Max {formatKES(max)}</p>
                  </div>
                  <div className="border-t border-white/10 bg-[#0060a3] px-6 py-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-100">Interest ({quote.interestRatePct}% · {quote.termDays} days)</span>
                      <span className="font-bold tabular-nums">{formatKES(quote.interestAmount)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-base">
                      <span className="font-bold text-white">Total to repay</span>
                      <span className="font-extrabold tabular-nums text-white">{formatKES(quote.totalRepayable)}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop CTA */}
                <div className="hidden lg:block">
                  {topError && (
                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700">
                      {topError}
                    </div>
                  )}
                  <Button onClick={onContinue} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0077C8] text-base font-bold text-white shadow-sm hover:bg-[#0060a3]">
                    Continue <ArrowRight size={18} />
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* MOBILE STICKY CTA */}
      <div className="fixed bottom-[64px] left-0 z-40 w-full border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        {topError && (
          <div className="mb-2 text-center text-xs font-bold text-red-600">{topError}</div>
        )}
        <Button onClick={onContinue} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0077C8] text-sm font-bold text-white">
          Continue <ArrowRight size={16} />
        </Button>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white px-2 py-3 md:hidden">
        <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Home size={22} /><span className="text-[10px] font-medium">Home</span>
        </button>
        <button onClick={() => router.push('/apply')} className="flex flex-col items-center gap-1 text-[#0077C8]">
          <Compass size={22} /><span className="text-[10px] font-bold">Apply</span>
        </button>
        <button onClick={() => router.push('/loans')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <FileText size={22} /><span className="text-[10px] font-medium">Loans</span>
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