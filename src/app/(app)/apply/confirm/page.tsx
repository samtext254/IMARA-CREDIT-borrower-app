'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Phone, Home, Shield, Compass, FileText, HelpCircle, LogOut, X, Menu, CheckCircle2, Clock, Zap } from 'lucide-react';
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
    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );
}

export default function ApplyConfirmPage() {
  const router = useRouter();

  const loginPhone = '+254712345678';

  const [mpesaNumber, setMpesaNumber] = useState(loginPhone);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 3 of 4</p>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Disbursement</h1>
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
                Funds will be sent to your M-Pesa. Confirm the number below.
              </p>
            </div>

            {/* THE DESKTOP GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
              
              {/* LEFT COLUMN: FORM */}
              <div className="space-y-6">
                
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-5 text-lg font-bold text-slate-900">M-Pesa Number</h3>
                  
                  <div className="space-y-5">
                    <div data-field="mpesaNumber">
                      <FieldLabel required>Number</FieldLabel>
                      <div className="relative mt-2">
                        <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-base font-medium focus-visible:ring-[#0077C8]/40"
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
                        <p className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Same as your login number
                        </p>
                      )}
                      {show('mpesaNumber') && (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {error ?? 'Enter your M-Pesa number'}
                        </p>
                      )}
                    </div>

                    <div>
                      <FieldLabel required>Confirmation</FieldLabel>
                      <button
                        type="button"
                        data-field="confirmed"
                        onClick={() => setConfirmed((v) => !v)}
                        className={`mt-2 flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                          confirmed
                            ? 'border-[#0077C8] bg-blue-50'
                            : show('confirmed')
                            ? 'border-red-300 bg-red-50/50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                            confirmed
                              ? 'border-[#0077C8] bg-[#0077C8] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {confirmed && (
                            <svg viewBox="0 0 12 12" className="h-3 w-3">
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
                        <span className="text-sm font-medium leading-6 text-slate-700">
                          I confirm this M-Pesa number is correct and belongs to me.
                        </span>
                      </button>
                      {show('confirmed') && (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          Please confirm the number
                        </p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: STICKY SUMMARY */}
              <div className="lg:sticky lg:top-6 h-fit space-y-6">
                
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="text-lg font-bold text-slate-900">What happens next?</h3>
                  <div className="mt-4 space-y-5">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0077C8]">
                        <Zap size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Instant Transfer</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                          Once approved, the funds are sent directly to this M-Pesa number.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                        <Clock size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Review & Approve</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                          You will have one last chance to review your loan terms before confirming.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop CTA */}
                <div className="hidden lg:block">
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