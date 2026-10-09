// src/app/kyc/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  User,
  MapPin,
  Briefcase,
  Users,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  getKycStatus,
  submitKyc,
  KycApiError,
  type KycStatusResponse,
  type KycSubmitPayload,
  type EmploymentStatus,
  type IncomeRange,
  employmentLabel,
  incomeLabel,
} from '@/lib/kyc-api';

// ─── Configuration ──────────────────────────────────────────────

const EMPLOYMENT_OPTIONS: EmploymentStatus[] = [
  'EMPLOYED',
  'SELF_EMPLOYED',
  'BUSINESS_OWNER',
  'STUDENT',
  'RETIRED',
  'UNEMPLOYED',
];

const INCOME_OPTIONS: IncomeRange[] = ['BELOW_5000', 'ABOVE_5000'];

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui',
  'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
  'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir',
  'West Pokot',
];

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Child',
  'Relative',
  'Friend',
  'Other',
];

type Step = 1 | 2 | 3 | 4 | 5;

interface FormState {
  // Step 1 — personal
  date_of_birth: string;
  // Step 2 — address
  county: string;
  town: string;
  street_address: string;
  // Step 3 — employment
  employment_status: EmploymentStatus | '';
  monthly_income_range: IncomeRange | '';
  // Step 4 — next of kin
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship: string;
}

const EMPTY_FORM: FormState = {
  date_of_birth: '',
  county: '',
  town: '',
  street_address: '',
  employment_status: '',
  monthly_income_range: '',
  next_of_kin_name: '',
  next_of_kin_phone: '',
  next_of_kin_relationship: '',
};

// ─── Small UI primitives ─────────────────────────────────────────

function StepHeader({
  step,
  total,
  title,
  onBack,
}: {
  step: Step;
  total: number;
  title: string;
  onBack: () => void;
}) {
  const percent = Math.round(((step - 1) / total) * 100);
  return (
    <div className="sticky top-0 z-20 bg-white">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid h-9 w-9 place-items-center rounded-full border border-ink-100 text-ink-700 transition active:scale-95"
        >
          <ArrowLeft size={16} strokeWidth={2.4} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            Step {step} of {total}
          </p>
          <h1 className="mt-0.5 text-[16px] font-bold tracking-tight text-ink-950">
            {title}
          </h1>
        </div>
      </div>
      <div className="h-1 w-full bg-ink-100">
        <div
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required = true,
  error,
}: {
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-[12px] font-semibold text-ink-700">
        {children}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      {error && <span className="text-[10px] font-medium text-red-600">{error}</span>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  autoComplete?: string;
  invalid?: boolean;
}) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        'w-full rounded-xl border bg-white px-4 py-3 text-[14px] text-ink-950 outline-none transition ' +
        'placeholder:text-ink-300 focus:border-plum-800 focus:ring-2 focus:ring-plum-800/10 ' +
        (invalid ? 'border-red-300' : 'border-ink-100')
      }
    />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={
        'flex w-full items-center justify-center gap-2 rounded-xl bg-plum-800 px-5 py-3.5 ' +
        'text-[14px] font-bold tracking-tight text-white transition ' +
        'active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50'
      }
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" strokeWidth={2.4} />
          Submitting…
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ─── Validation ──────────────────────────────────────────────────

function isAdult(dateStr: string, minAge = 18): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age -= 1;
  return age >= minAge;
}

function digitsOnly(s: string): string {
  return (s || '').replace(/\D/g, '');
}

function validateStep(step: Step, form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!form.date_of_birth) errors.date_of_birth = 'Required';
    else if (!isAdult(form.date_of_birth))
      errors.date_of_birth = 'Must be 18 or older';
  }
  if (step === 2) {
    if (!form.county || form.county.length < 2) errors.county = 'Required';
    if (!form.town || form.town.length < 2) errors.town = 'Required';
    if (!form.street_address || form.street_address.length < 3)
      errors.street_address = 'Required';
  }
  if (step === 3) {
    if (!form.employment_status) errors.employment_status = 'Required';
    if (!form.monthly_income_range) errors.monthly_income_range = 'Required';
  }
  if (step === 4) {
    if (!form.next_of_kin_name || form.next_of_kin_name.length < 2)
      errors.next_of_kin_name = 'Required';
    if (digitsOnly(form.next_of_kin_phone).length < 9)
      errors.next_of_kin_phone = 'Invalid phone';
  }
  return errors;
}

// ─── Page ────────────────────────────────────────────────────────

export default function KycPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<KycStatusResponse | null>(null);

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // ─── Load current status ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getKycStatus();
        if (cancelled) return;
        setStatus(data);

        // If already verified, send them back home
        if (data.kycStatus === 'VERIFIED') {
          router.replace('/home');
          return;
        }
        // If already submitted, show the "under review" state
        if (data.kycStatus === 'SUBMITTED') {
          setDone(true);
        }

        // Prefill any saved fields so resubmission is quick
        setForm({
          date_of_birth: data.submittedFields.date_of_birth || '',
          county: data.submittedFields.county || '',
          town: data.submittedFields.town || '',
          street_address: data.submittedFields.street_address || '',
          employment_status: data.submittedFields.employment_status || '',
          monthly_income_range: data.submittedFields.monthly_income_range || '',
          next_of_kin_name: data.submittedFields.next_of_kin_name || '',
          next_of_kin_phone: data.submittedFields.next_of_kin_phone || '',
          next_of_kin_relationship:
            data.submittedFields.next_of_kin_relationship || '',
        });
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load KYC status.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const next = () => {
    const errs = validateStep(step, form);
    setStepErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  };

  const back = () => {
    if (step === 1) {
      router.back();
      return;
    }
    setStepErrors({});
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    // Revalidate everything
    const allErrors: Record<string, string> = {};
    for (const s of [1, 2, 3, 4] as Step[]) {
      Object.assign(allErrors, validateStep(s, form));
    }
    if (Object.keys(allErrors).length > 0) {
      setStepErrors(allErrors);
      // Jump to the first errored step
      const firstErrored = ([1, 2, 3, 4] as Step[]).find(
        (s) => Object.keys(validateStep(s, form)).length > 0
      );
      if (firstErrored) setStep(firstErrored);
      return;
    }

    setSubmitting(true);
    try {
      const payload: KycSubmitPayload = {
        date_of_birth: form.date_of_birth,
        county: form.county.trim(),
        town: form.town.trim(),
        street_address: form.street_address.trim(),
        employment_status: form.employment_status as EmploymentStatus,
        monthly_income_range: form.monthly_income_range as IncomeRange,
        next_of_kin_name: form.next_of_kin_name.trim(),
        next_of_kin_phone: form.next_of_kin_phone.trim(),
        next_of_kin_relationship: form.next_of_kin_relationship.trim() || undefined,
      };
      await submitKyc(payload);
      setDone(true);
    } catch (e: any) {
      if (e instanceof KycApiError && e.errors) {
        setStepErrors(e.errors);
      }
      setSubmitError(e?.message || 'Failed to submit KYC. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render guards ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-page grid place-items-center">
        <Loader2 className="animate-spin text-plum-800" size={28} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-page p-6">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Could not load KYC status</p>
              <p className="mt-1 text-red-700/90">{loadError}</p>
              <button
                type="button"
                onClick={() => router.push('/home')}
                className="mt-3 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-red-800 ring-1 ring-red-200"
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success / under review screen ──────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="sticky top-0 z-20 bg-white">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => router.push('/home')}
              aria-label="Back"
              className="grid h-9 w-9 place-items-center rounded-full border border-ink-100 text-ink-700 transition active:scale-95"
            >
              <ArrowLeft size={16} strokeWidth={2.4} />
            </button>
            <h1 className="text-[16px] font-bold tracking-tight text-ink-950">
              KYC
            </h1>
          </div>
          <div className="h-1 w-full bg-brand-500" />
        </div>

        <div className="mx-auto max-w-md px-4 pt-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-500/20">
            <CheckCircle2 size={32} className="text-plum-800" strokeWidth={2.2} />
          </div>
          <h2 className="mt-5 text-[19px] font-bold tracking-tight text-ink-950">
            {status?.kycStatus === 'SUBMITTED'
              ? 'Your KYC is under review'
              : 'KYC submitted'}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
            We&apos;ll notify you as soon as your details have been reviewed.
            This usually takes less than 24 hours.
          </p>

          <button
            type="button"
            onClick={() => router.push('/home')}
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-plum-800 px-5 py-3.5 text-[14px] font-bold tracking-tight text-white transition active:scale-[0.985]"
          >
            Back to home
            <ChevronRight size={16} strokeWidth={2.6} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Form steps ─────────────────────────────────────────
  const stepTitles: Record<Step, string> = {
    1: 'Personal details',
    2: 'Contact & address',
    3: 'Employment & income',
    4: 'Next of kin',
    5: 'Review & submit',
  };

  return (
    <div className="min-h-screen bg-page pb-28">
      <StepHeader
        step={step}
        total={5}
        title={stepTitles[step]}
        onBack={back}
      />

      <div className="mx-auto max-w-md px-4 pt-4">
        {/* ─── Step 1: Personal ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                From your account
              </p>
              <div className="mt-2 space-y-2 text-[13px]">
                <Row label="Full name" value={status?.prefilled.full_name || '—'} />
                <Row label="National ID" value={status?.prefilled.national_id || '—'} />
                <Row label="Phone" value={status?.prefilled.phone || '—'} />
              </div>
            </div>

            <div>
              <FieldLabel error={stepErrors.date_of_birth}>
                Date of birth
              </FieldLabel>
              <TextInput
                type="date"
                value={form.date_of_birth}
                onChange={(v) => set('date_of_birth', v)}
                invalid={!!stepErrors.date_of_birth}
              />
              <p className="mt-1 text-[11px] text-ink-400">
                You must be at least 18 years old.
              </p>
            </div>
          </div>
        )}

        {/* ─── Step 2: Address ──────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <FieldLabel error={stepErrors.county}>County</FieldLabel>
              <select
                value={form.county}
                onChange={(e) => set('county', e.target.value)}
                className={
                  'w-full rounded-xl border bg-white px-4 py-3 text-[14px] text-ink-950 outline-none transition ' +
                  'focus:border-plum-800 focus:ring-2 focus:ring-plum-800/10 ' +
                  (stepErrors.county ? 'border-red-300' : 'border-ink-100')
                }
              >
                <option value="">Select your county…</option>
                {KENYA_COUNTIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel error={stepErrors.town}>Town / City</FieldLabel>
              <TextInput
                value={form.town}
                onChange={(v) => set('town', v)}
                placeholder="e.g. Westlands"
                invalid={!!stepErrors.town}
              />
            </div>

            <div>
              <FieldLabel error={stepErrors.street_address}>Street address</FieldLabel>
              <TextInput
                value={form.street_address}
                onChange={(v) => set('street_address', v)}
                placeholder="e.g. 12 Mpaka Road"
                invalid={!!stepErrors.street_address}
              />
            </div>
          </div>
        )}

        {/* ─── Step 3: Employment ───────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <FieldLabel error={stepErrors.employment_status}>
                Employment status
              </FieldLabel>
              <div className="grid grid-cols-1 gap-2">
                {EMPLOYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('employment_status', opt)}
                    className={
                      'rounded-xl border px-4 py-3 text-left text-[13px] font-semibold transition ' +
                      (form.employment_status === opt
                        ? 'border-plum-800 bg-plum-800/5 text-plum-800'
                        : 'border-ink-100 bg-white text-ink-700 hover:bg-ink-100/40')
                    }
                  >
                    {employmentLabel(opt)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel error={stepErrors.monthly_income_range}>
                Monthly income
              </FieldLabel>
              <div className="grid grid-cols-1 gap-2">
                {INCOME_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('monthly_income_range', opt)}
                    className={
                      'rounded-xl border px-4 py-3 text-left text-[13px] font-semibold transition ' +
                      (form.monthly_income_range === opt
                        ? 'border-plum-800 bg-plum-800/5 text-plum-800'
                        : 'border-ink-100 bg-white text-ink-700 hover:bg-ink-100/40')
                    }
                  >
                    {incomeLabel(opt)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 4: Next of kin ──────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <FieldLabel error={stepErrors.next_of_kin_name}>
                Next of kin name
              </FieldLabel>
              <TextInput
                value={form.next_of_kin_name}
                onChange={(v) => set('next_of_kin_name', v)}
                placeholder="e.g. Jane Doe"
                invalid={!!stepErrors.next_of_kin_name}
              />
            </div>

            <div>
              <FieldLabel error={stepErrors.next_of_kin_phone}>
                Next of kin phone
              </FieldLabel>
              <TextInput
                type="tel"
                inputMode="tel"
                value={form.next_of_kin_phone}
                onChange={(v) => set('next_of_kin_phone', v)}
                placeholder="e.g. +254712345678"
                invalid={!!stepErrors.next_of_kin_phone}
              />
            </div>

            <div>
              <FieldLabel required={false}>Relationship</FieldLabel>
              <select
                value={form.next_of_kin_relationship}
                onChange={(e) => set('next_of_kin_relationship', e.target.value)}
                className="w-full rounded-xl border border-ink-100 bg-white px-4 py-3 text-[14px] text-ink-950 outline-none transition focus:border-plum-800 focus:ring-2 focus:ring-plum-800/10"
              >
                <option value="">Optional — select…</option>
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ─── Step 5: Review ───────────────────────────── */}
        {step === 5 && (
          <div className="space-y-4">
            <ReviewCard
              icon={<User size={14} strokeWidth={2.4} />}
              title="Personal"
              onEdit={() => setStep(1)}
              rows={[
                ['Full name', status?.prefilled.full_name || '—'],
                ['National ID', status?.prefilled.national_id || '—'],
                ['Date of birth', form.date_of_birth || '—'],
              ]}
            />

            <ReviewCard
              icon={<MapPin size={14} strokeWidth={2.4} />}
              title="Address"
              onEdit={() => setStep(2)}
              rows={[
                ['County', form.county || '—'],
                ['Town', form.town || '—'],
                ['Street', form.street_address || '—'],
              ]}
            />

            <ReviewCard
              icon={<Briefcase size={14} strokeWidth={2.4} />}
              title="Employment"
              onEdit={() => setStep(3)}
              rows={[
                ['Status', employmentLabel(form.employment_status)],
                ['Income', incomeLabel(form.monthly_income_range)],
              ]}
            />

            <ReviewCard
              icon={<Users size={14} strokeWidth={2.4} />}
              title="Next of kin"
              onEdit={() => setStep(4)}
              rows={[
                ['Name', form.next_of_kin_name || '—'],
                ['Phone', form.next_of_kin_phone || '—'],
                ['Relationship', form.next_of_kin_relationship || '—'],
              ]}
            />

            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              <ClipboardCheck size={15} className="mt-0.5 shrink-0" />
              <p>
                By submitting, you confirm the information is accurate. Your
                lender will review it and verify your KYC.
              </p>
            </div>

            {submitError && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <p>{submitError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom action bar ───────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          {step < 5 ? (
            <PrimaryButton onClick={next}>
              Continue
              <ChevronRight size={16} strokeWidth={2.6} />
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={handleSubmit} loading={submitting}>
              Submit application
              <ChevronRight size={16} strokeWidth={2.6} />
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-400">{label}</span>
      <span className="font-semibold text-ink-950">{value}</span>
    </div>
  );
}

function ReviewCard({
  icon,
  title,
  onEdit,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  onEdit: () => void;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-plum-50 text-plum-700">
          {icon}
        </div>
        <p className="flex-1 text-[12px] font-semibold tracking-tight text-ink-950">
          {title}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-semibold text-plum-800 hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="space-y-2 px-4 py-3">
        {rows.map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}