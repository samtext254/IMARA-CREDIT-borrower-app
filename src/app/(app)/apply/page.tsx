'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, User } from 'lucide-react';
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

const SELECT_CLASS =
  'mt-1 h-11 w-full rounded-xl border border-ink-700/10 bg-white px-3.5 text-[14px] text-ink-950 focus:outline-none focus:ring-2 focus:ring-plum-500/30 focus:border-plum-700';

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
    <div className="min-h-screen bg-page pb-28">
      {/* NAV */}
      <div className="sticky top-0 z-30 border-b border-ink-100 bg-white">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => router.push('/apply/loan')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100/70 text-ink-800 transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Step 2 of 4
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink-950">
              Your details
            </h1>
          </div>
        </div>
        <div className="h-0.5 w-full bg-ink-100">
          {/* progress bar — yellow */}
          <div className="h-full w-2/4 bg-brand-500 transition-all" />
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <p className="text-[11px] leading-snug text-ink-500">
          Collected once. Future applications will skip this step.
        </p>
        <p className="mt-0.5 text-[10.5px] font-medium text-ink-400">
          Fields marked <span className="text-red-500">*</span> are required.
        </p>
      </div>

      <SectionCard title="Personal information">
        <label className="block">
          <FieldLabel required>Full name</FieldLabel>
          <Input
            data-field="fullName"
            className="mt-1"
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
            className="mt-1"
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
            className="mt-1"
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
            className="mt-1"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {show('email') && <FieldError>Enter a valid email</FieldError>}
        </label>
      </SectionCard>

      <div className="mt-2 bg-white">
        <div className="border-b border-ink-100 px-4 py-3">
          <h2 className="text-[13px] font-bold tracking-tight text-ink-950">
            Applying as a business?
          </h2>
          <p className="mt-0.5 text-[10.5px] leading-snug text-ink-400">
            We&apos;ll ask for a few business details.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 px-4 py-3">
          <button
            type="button"
            onClick={() => setIsBusiness(false)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 transition ${
              !isBusiness
                ? 'border-plum-700 bg-plum-50 text-plum-700'
                : 'border-ink-100 bg-white text-ink-500'
            }`}
          >
            <User size={18} strokeWidth={2.2} />
            <span className="text-[11.5px] font-semibold">Individual</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBusiness(true)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 transition ${
              isBusiness
                ? 'border-plum-700 bg-plum-50 text-plum-700'
                : 'border-ink-100 bg-white text-ink-500'
            }`}
          >
            <Building2 size={18} strokeWidth={2.2} />
            <span className="text-[11.5px] font-semibold">Business</span>
          </button>
        </div>
      </div>

      {isBusiness && (
        <SectionCard title="Business information">
          <label className="block">
            <FieldLabel required>Business name</FieldLabel>
            <Input
              data-field="businessInfo.name"
              className="mt-1"
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
                className="mt-1"
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
              className="mt-1"
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
              onChange={(e) =>
                setBizRevenue(e.target.value as MonthlyRevenueRange)
              }
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
              className="mt-1"
              inputMode="numeric"
              placeholder="e.g. 3"
              value={bizYears}
              onChange={(e) => setBizYears(e.target.value.replace(/\D/g, ''))}
              maxLength={2}
            />
          </label>
        </SectionCard>
      )}

      <div className="fixed bottom-14 left-1/2 z-20 w-full max-w-[28rem] -translate-x-1/2 border-t border-ink-100 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <Button type="button" onClick={onContinue} className="w-full" size="md">
          Continue
          <ArrowRight size={15} strokeWidth={2.5} className="ml-1.5" />
        </Button>
      </div>
    </div>
  );
}