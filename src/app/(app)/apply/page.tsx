'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, User, Home, Shield, Compass, FileText, HelpCircle, LogOut, X, Menu, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readDraft, writeDraft } from '@/lib/apply-draft';
import {
  validateKyc,
  BUSINESS_TYPE_LABELS,
  REVENUE_LABELS,
  type BusinessType,
  type KycProfile,
  type MonthlyRevenueRange,
} from '@/lib/lending-types';

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

const SELECT_CLASS =
  'mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#0077C8] focus:ring-4 focus:ring-[#0077C8]/20 transition';

export default function ApplyDetailsPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');

  const [isBusiness, setIsBusiness] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('sole_prop');
  const [bizRegNo, setBizRegNo] = useState('');
  const [bizKraPin, setBizKraPin] = useState('');
  const [bizRevenue, setBizRevenue] = useState<MonthlyRevenueRange>('10k_50k');
  const [bizYears, setBizYears] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    const k = draft.kyc;
    if (!k) return;
    setFullName(k.fullName ?? '');
    setNationalId(k.nationalId ?? '');
    setDateOfBirth(k.dateOfBirth ?? '');
    setEmail(k.email ?? '');
    setIsBusiness(k.isBusiness ?? false);
    if (k.businessInfo) {
      setBizName(k.businessInfo.name ?? '');
      setBizType(k.businessInfo.type ?? 'sole_prop');
      setBizRegNo(k.businessInfo.registrationNumber ?? '');
      setBizKraPin(k.businessInfo.kraPin ?? '');
      setBizRevenue(k.businessInfo.monthlyRevenue ?? '10k_50k');
      setBizYears(
        k.businessInfo.yearsInBusiness != null
          ? String(k.businessInfo.yearsInBusiness)
          : ''
      );
    }
  }, []);

  const kyc: Partial<KycProfile> = useMemo(
    () => ({
      fullName,
      nationalId,
      dateOfBirth,
      email,
      isBusiness,
      businessInfo: isBusiness
        ? {
            name: bizName,
            type: bizType,
            registrationNumber: bizRegNo || undefined,
            kraPin: bizKraPin,
            monthlyRevenue: bizRevenue,
            yearsInBusiness: Number(bizYears) || 0,
          }
        : undefined,
    }),
    [
      fullName, nationalId, dateOfBirth, email, isBusiness,
      bizName, bizType, bizRegNo, bizKraPin, bizRevenue, bizYears,
    ]
  );

  const validation = validateKyc(kyc);
  const show = (field: string) => submitted && validation.missing.includes(field);

  function onContinue() {
    setSubmitted(true);
    if (!validation.ok) {
      const first = validation.missing[0];
      const el = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.focus?.();
      return;
    }

    writeDraft({
      kyc: {
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        dateOfBirth,
        email: email.trim(),
        isBusiness,
        businessInfo: isBusiness
          ? {
              name: bizName.trim(),
              type: bizType,
              registrationNumber: bizRegNo.trim() || undefined,
              kraPin: bizKraPin.trim(),
              monthlyRevenue: bizRevenue,
              yearsInBusiness: Number(bizYears) || 0,
            }
          : undefined,
      },
    });

    router.push('/apply/confirm'); // Step 3
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
              <button onClick={() => router.push('/apply/loan')} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 2 of 4</p>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Your Details</h1>
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
                Collected once. Future applications will skip this step.
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Fields marked <span className="text-red-500">*</span> are required.
              </p>
            </div>

            {/* THE DESKTOP GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
              
              {/* LEFT COLUMN: FORMS */}
              <div className="space-y-6">
                
                {/* PERSONAL INFO */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="mb-5 text-lg font-bold text-slate-900">Personal information</h3>
                  
                  <div className="space-y-4">
                    <label className="block">
                      <FieldLabel required>Full name</FieldLabel>
                      <Input
                        data-field="fullName"
                        className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                        placeholder="As it appears on your ID"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      {show('fullName') && <FieldError>Enter your full name</FieldError>}
                    </label>

                    <label className="block">
                      <FieldLabel required>National ID number</FieldLabel>
                      <Input
                        data-field="nationalId"
                        className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                        inputMode="numeric"
                        placeholder="12345678"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                        maxLength={8}
                      />
                      {show('nationalId') && (
                        <FieldError>Enter your 7–8 digit national ID</FieldError>
                      )}
                    </label>

                    <label className="block">
                      <FieldLabel required>Date of birth</FieldLabel>
                      <Input
                        data-field="dateOfBirth"
                        className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        max={new Date().toISOString().slice(0, 10)}
                      />
                      {show('dateOfBirth') && <FieldError>Select your date of birth</FieldError>}
                    </label>

                    <label className="block">
                      <FieldLabel required>Email</FieldLabel>
                      <Input
                        data-field="email"
                        className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                        type="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      {show('email') && <FieldError>Enter a valid email</FieldError>}
                    </label>
                  </div>
                </div>

                {/* BUSINESS TOGGLE */}
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="text-lg font-bold text-slate-900">Applying as a business?</h3>
                  <p className="mb-5 mt-1 text-xs text-slate-500">We'll ask for a few business details.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setIsBusiness(false)}
                      className={`flex flex-col items-center gap-2 rounded-xl border py-4 transition ${
                        !isBusiness
                          ? 'border-[#0077C8] bg-blue-50 text-[#0077C8]'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <User size={22} strokeWidth={2.2} />
                      <span className="text-sm font-bold">Individual</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsBusiness(true)}
                      className={`flex flex-col items-center gap-2 rounded-xl border py-4 transition ${
                        isBusiness
                          ? 'border-[#0077C8] bg-blue-50 text-[#0077C8]'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Building2 size={22} strokeWidth={2.2} />
                      <span className="text-sm font-bold">Business</span>
                    </button>
                  </div>
                </div>

                {/* BUSINESS FORM */}
                {isBusiness && (
                  <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                    <h3 className="mb-5 text-lg font-bold text-slate-900">Business information</h3>
                    
                    <div className="space-y-4">
                      <label className="block">
                        <FieldLabel required>Business name</FieldLabel>
                        <Input
                          data-field="businessInfo.name"
                          className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                          placeholder="e.g. Sam's Grocers"
                          value={bizName}
                          onChange={(e) => setBizName(e.target.value)}
                        />
                        {show('businessInfo.name') && (
                          <FieldError>Enter your business name</FieldError>
                        )}
                      </label>

                      <label className="block">
                        <FieldLabel required>Business type</FieldLabel>
                        <select
                          className={SELECT_CLASS}
                          value={bizType}
                          onChange={(e) => setBizType(e.target.value as BusinessType)}
                        >
                          {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((t) => (
                            <option key={t} value={t}>
                              {BUSINESS_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </label>

                      {bizType !== 'sole_prop' && (
                        <label className="block">
                          <FieldLabel required>Registration number</FieldLabel>
                          <Input
                            className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                            placeholder="e.g. CPR/2020/123456"
                            value={bizRegNo}
                            onChange={(e) => setBizRegNo(e.target.value)}
                          />
                        </label>
                      )}

                      <label className="block">
                        <FieldLabel required>KRA PIN</FieldLabel>
                        <Input
                          data-field="businessInfo.kraPin"
                          className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                          placeholder="A012345678Z"
                          value={bizKraPin}
                          onChange={(e) => setBizKraPin(e.target.value.toUpperCase())}
                          maxLength={11}
                        />
                        {show('businessInfo.kraPin') && (
                          <FieldError>Enter your KRA PIN</FieldError>
                        )}
                      </label>

                      <label className="block">
                        <FieldLabel required>Monthly revenue</FieldLabel>
                        <select
                          className={SELECT_CLASS}
                          value={bizRevenue}
                          onChange={(e) => setBizRevenue(e.target.value as MonthlyRevenueRange)}
                        >
                          {(Object.keys(REVENUE_LABELS) as MonthlyRevenueRange[]).map((r) => (
                            <option key={r} value={r}>
                              {REVENUE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <FieldLabel>Years in business</FieldLabel>
                        <Input
                          className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0077C8]/40"
                          inputMode="numeric"
                          placeholder="e.g. 3"
                          value={bizYears}
                          onChange={(e) => setBizYears(e.target.value.replace(/\D/g, ''))}
                          maxLength={2}
                        />
                      </label>
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: STICKY SUMMARY */}
              <div className="lg:sticky lg:top-6 h-fit space-y-6">
                
                <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                  <h3 className="text-lg font-bold text-slate-900">Why we need this</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                        <CheckCircle2 size={14} />
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        <strong className="text-slate-900">Verify Identity:</strong> To protect you against fraud and comply with Kenyan regulations.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                        <CheckCircle2 size={14} />
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        <strong className="text-slate-900">Faster Approvals:</strong> Complete details ensure your application is reviewed instantly.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
                        <CheckCircle2 size={14} />
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        <strong className="text-slate-900">Higher Limits:</strong> Business details unlock higher borrowing limits.
                      </p>
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