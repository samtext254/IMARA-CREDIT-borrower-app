'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Home, Shield, Compass, FileText, HelpCircle, LogOut, X, Menu, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readDraft, clearDraft } from '@/lib/apply-draft';
import {
  computeLoanQuote,
  formatKES,
  PURPOSE_LABELS,
  type LoanApplicationDraft,
} from '@/lib/lending-types';
import { ImaraApiError } from '@/lib/api';
import { loans as loansApi } from '@/lib/loans';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-bold text-slate-900">{value}</span>
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
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  async function onSubmit() {
    setSubmitted(true);
    setError(null);
    if (!canSubmit) return;

    const productId = draft.productId;
    const amount = draft.request?.amount;
    const termDays = draft.request?.termDays;

    if (!productId) {
      setError('Missing product. Please start the application again.');
      return;
    }
    if (!amount || !termDays) {
      setError('Missing amount or term. Please start again.');
      return;
    }

    setBusy(true);
    try {
      await loansApi.apply({
        product_id: productId,
        principal: amount,
        term_days: termDays,
      });

      clearDraft();
      router.push('/apply-done');
    } catch (err) {
      if (err instanceof ImaraApiError) {
        switch (err.code) {
          case 'AMOUNT_OUT_OF_RANGE':
            setError('The amount is outside the allowed range.');
            break;
          case 'TERM_OUT_OF_RANGE':
            setError('The term is outside the allowed range.');
            break;
          case 'LIMIT_EXCEEDED':
            setError('The amount exceeds your available credit limit.');
            break;
          case 'NO_CREDIT_LIMIT':
            setError('You do not have an active credit limit. Contact your lender.');
            break;
          case 'KYC_REQUIRED':
            setError('Your KYC verification is incomplete.');
            break;
          case 'PRODUCT_INACTIVE':
            setError('This loan product is not currently available.');
            break;
          default:
            setError(err.message || 'Could not submit your application.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
      setBusy(false);
    }
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 4 of 4</p>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Review & Sign</h1>
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
                Please check the details below before submitting.
              </p>
            </div>

            {/* THE DESKTOP GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
              
              {/* LEFT COLUMN: SUMMARY DETAILS */}
              <div className="space-y-6">
                
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">Loan summary</h3>
                  
                  <div className="overflow-hidden rounded-2xl bg-[#0077C8] text-white shadow-lg">
                    <div className="px-6 pt-6 pb-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-200">You will receive</p>
                      <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{formatKES(quote.amount)}</p>
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

                  <div className="mt-6 divide-y divide-slate-100">
                    <Row label="Purpose" value={draft.request?.purpose ? PURPOSE_LABELS[draft.request.purpose] : '—'} />
                    {draft.request?.purposeNote && <Row label="Note" value={draft.request.purposeNote} />}
                    <Row label="Term" value={`${quote.termDays} days`} />
                    <Row label="M-Pesa" value={draft.disbursement?.mpesaNumber ?? '—'} />
                  </div>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-4 text-lg font-bold text-slate-900">Your details</h3>
                  <div className="divide-y divide-slate-100">
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
                </div>

              </div>

              {/* RIGHT COLUMN: AGREEMENT (Sticky) */}
              <div className="lg:sticky lg:top-6 h-fit space-y-6">
                
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="text-lg font-bold text-slate-900">Sign Agreement</h3>
                  <p className="mb-5 mt-1 text-sm text-slate-500">Review the terms and sign to finalize.</p>
                  
                  <button
                    type="button"
                    onClick={() => setTermsAccepted((v) => !v)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                      termsAccepted
                        ? 'border-[#0077C8] bg-blue-50'
                        : show('terms')
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                      termsAccepted ? 'border-[#0077C8] bg-[#0077C8] text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {termsAccepted && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="text-sm font-medium leading-6 text-slate-700">
                      I accept the Terms &amp; Conditions and confirm all details above are correct.
                    </span>
                  </button>
                  {show('terms') && <p className="mt-2 text-xs font-medium text-red-600">Please accept the terms</p>}

                  <div className="mt-6">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Sign by typing your full name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      className={`mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-base font-medium focus-visible:ring-[#0077C8]/40 ${
                        show('signature') ? 'border-red-400 ring-2 ring-red-100' : ''
                      }`}
                      placeholder="Type your full name"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                    />
                    {show('signature') && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {signature.trim().length <= 2
                          ? 'Type your full name to sign'
                          : 'Name must match the one you entered earlier'}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    <Lock size={16} className="text-slate-400" />
                    <span>Your data is encrypted and securely submitted.</span>
                  </div>
                </div>

                {/* Desktop CTA */}
                <div className="hidden lg:block">
                  {error && (
                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      {error}
                    </div>
                  )}
                  <Button
                    onClick={onSubmit}
                    disabled={busy}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#0077C8] text-base font-bold text-white shadow-sm hover:bg-[#0060a3] disabled:opacity-60"
                  >
                    {busy ? (
                      <>
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Submitting…
                      </>
                    ) : (
                      'Submit application'
                    )}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* MOBILE STICKY CTA */}
      <div className="fixed bottom-[64px] left-0 z-40 w-full border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
        {error && (
          <div className="mb-2 text-center text-xs font-bold text-red-600">{error}</div>
        )}
        <Button
          onClick={onSubmit}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0077C8] text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Submitting…' : 'Submit application'}
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