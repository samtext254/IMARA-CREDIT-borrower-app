/* ------------------------------------------------------------------ */
/*  IMARA CREDIT — shared TypeScript types                             */
/*  Consumed by: apply flow, future API client, backend DTO alignment  */
/* ------------------------------------------------------------------ */

/* ================================================================ */
/*  Enums                                                           */
/* ================================================================ */

export type BusinessType = 'sole_prop' | 'limited' | 'partnership';

export type MonthlyRevenueRange =
  | 'under_10k'
  | '10k_50k'
  | '50k_200k'
  | '200k_500k'
  | 'over_500k';

export type LoanTermDays = 7 | 14 | 30 | 60 | 90;

export type LoanPurpose =
  | 'business_stock'
  | 'working_capital'
  | 'equipment'
  | 'emergency'
  | 'school_fees'
  | 'other';

export type RepaymentFrequency = 'weekly' | 'biweekly' | 'monthly';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'active'
  | 'overdue'
  | 'paid'
  | 'defaulted';

/* ================================================================ */
/*  KYC — collected once per borrower                               */
/* ================================================================ */

export interface BusinessInfo {
  name: string;
  type: BusinessType;
  registrationNumber?: string;   // optional for sole prop
  kraPin: string;
  monthlyRevenue: MonthlyRevenueRange;
  yearsInBusiness: number;
}

export interface KycProfile {
  /** Full legal name as it appears on national ID */
  fullName: string;
  /** Kenyan national ID number, 7–8 digits */
  nationalId: string;
  /** ISO date string YYYY-MM-DD */
  dateOfBirth: string;
  /** Contact email */
  email: string;
  /** Applying as a business? If false, businessInfo is undefined */
  isBusiness: boolean;
  /** Present only when isBusiness === true */
  businessInfo?: BusinessInfo;
}
/* ================================================================ */
/*  Interest rates                                                  */
/* ================================================================ */

/**
 * Simple flat interest per term, expressed as a percentage of the
 * principal. Fixed for the life of the loan.
 *
 *   7 days  → 13%
 *   14 days → 13%
 *   30 days → 15%
 *   60 days → 18%
 *   90 days → 18%
 *
 * These are the source of truth for the borrower app; the engine
 * should eventually return them per-product.
 */
export const INTEREST_RATES: Record<LoanTermDays, number> = {
  7: 13,
  14: 13,
  30: 15,
  60: 18,
  90: 18,
};

export function getInterestRate(termDays: LoanTermDays): number {
  return INTEREST_RATES[termDays] ?? 15;
}

/* ================================================================ */
/*  Loan quote — what the user will actually repay                  */
/* ================================================================ */

export interface LoanQuote {
  amount: number;
  termDays: LoanTermDays;
  /** Percentage, e.g. 15 (means 15%) */
  interestRatePct: number;
  /** KES amount of interest */
  interestAmount: number;
  /** amount + interest (disbursement is net of fees; fees = 0 for now) */
  totalRepayable: number;
  /** Convenience: totalRepayable / termDays, rounded */
  dailyRepayment: number;
}

export function computeLoanQuote(
  amount: number,
  termDays: LoanTermDays
): LoanQuote {
  const safeAmount = Math.max(0, Math.floor(amount || 0));
  const ratePct = getInterestRate(termDays);
  const interestAmount = Math.round((safeAmount * ratePct) / 100);
  const totalRepayable = safeAmount + interestAmount;
  const dailyRepayment =
    termDays > 0 ? Math.round(totalRepayable / termDays) : totalRepayable;

  return {
    amount: safeAmount,
    termDays,
    interestRatePct: ratePct,
    interestAmount,
    totalRepayable,
    dailyRepayment,
  };
}

/* ================================================================ */
/*  Application — collected per loan                                */
/* ================================================================ */

export interface LoanRequest {
  /** Loan principal in KES, integer */
  amount: number;
  /** Tenure in days */
  termDays: LoanTermDays;
  /** Primary reason for the loan */
  purpose: LoanPurpose;
  /** Free-text explanation when purpose === 'other' */
  purposeNote?: string;
}

export interface DisbursementInfo {
  /** M-Pesa number in +2547XXXXXXXX format */
  mpesaNumber: string;
  /** Explicit confirmation that number is correct */
  confirmed: boolean;
}

export interface RepaymentPreferences {
  frequency: RepaymentFrequency;
  /** Consent to auto-trigger STK push on due date */
  autoDebitConsent: boolean;
}

export interface AgreementAcceptance {
  termsAccepted: boolean;
  /** E-signature — the user's typed full name */
  signature: string;
  /** ISO timestamp when signature was given */
  signedAt: string;
}

/** Everything collected across the apply flow, as one draft object */
export interface LoanApplicationDraft {
  kyc: KycProfile;
  request: LoanRequest;
  disbursement: DisbursementInfo;
  repayment: RepaymentPreferences;
  agreement: AgreementAcceptance;
}

/* ================================================================ */
/*  Server-side response shapes                                     */
/*  These mirror what the credit-service-engine returns.            */
/*  Kept loose for now — tighten when we wire the backend.          */
/* ================================================================ */

export interface CreditLimit {
  /** Max amount the borrower can request right now, KES */
  maxAmount: number;
  /** Currency, always 'KES' */
  currency: 'KES';
  /** Risk band, e.g. 'A' | 'B' | 'C' */
  scoreBand?: string;
  /** If not eligible, reason text */
  reason?: string;
}

export interface LoanApplicationResponse {
  id: string;
  status: ApplicationStatus;
  amount: number;
  termDays: number;
  submittedAt: string;
  /** Anything else the engine returns; keep as unknown until wired */
  meta?: Record<string, unknown>;
}

/* ================================================================ */
/*  API envelope — matches the engine's uniform shape               */
/* ================================================================ */

export interface ApiError {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

/* ================================================================ */
/*  Display helpers                                                 */
/* ================================================================ */

export const PURPOSE_LABELS: Record<LoanPurpose, string> = {
  business_stock: 'Business stock',
  working_capital: 'Working capital',
  equipment: 'Equipment',
  emergency: 'Emergency',
  school_fees: 'School fees',
  other: 'Other',
};

export const TERM_LABELS: Record<LoanTermDays, string> = {
  7: '7 days',
  14: '2 weeks',
  30: '1 month',
  60: '2 months',
  90: '3 months',
};

export const FREQUENCY_LABELS: Record<RepaymentFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
};

export const REVENUE_LABELS: Record<MonthlyRevenueRange, string> = {
  under_10k: 'Under KES 10,000',
  '10k_50k': 'KES 10,000 – 50,000',
  '50k_200k': 'KES 50,000 – 200,000',
  '200k_500k': 'KES 200,000 – 500,000',
  over_500k: 'Over KES 500,000',
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  sole_prop: 'Sole proprietor',
  limited: 'Limited company',
  partnership: 'Partnership',
};

/* ------------------------------------------------------------------ */
/*  Runtime validation for the draft                                */
/*  Used before submission; keeps the flow safe from missing fields */
/* ------------------------------------------------------------------ */

export interface DraftValidationResult {
  ok: boolean;
  missing: string[];
}

export function validateKyc(kyc: Partial<KycProfile>): DraftValidationResult {
  const missing: string[] = [];
  if (!kyc.fullName?.trim()) missing.push('fullName');
  if (!kyc.nationalId?.trim()) missing.push('nationalId');
  if (!kyc.dateOfBirth?.trim()) missing.push('dateOfBirth');
  if (!kyc.email?.trim()) missing.push('email');
  if (kyc.isBusiness) {
    if (!kyc.businessInfo?.name?.trim()) missing.push('businessInfo.name');
    if (!kyc.businessInfo?.kraPin?.trim()) missing.push('businessInfo.kraPin');
  }
  return { ok: missing.length === 0, missing };
}

export function validateLoanRequest(req: Partial<LoanRequest>): DraftValidationResult {
  const missing: string[] = [];
  if (typeof req.amount !== 'number' || req.amount <= 0) missing.push('amount');
  if (!req.termDays) missing.push('termDays');
  if (!req.purpose) missing.push('purpose');
  if (req.purpose === 'other' && !req.purposeNote?.trim()) missing.push('purposeNote');
  return { ok: missing.length === 0, missing };
}

export function validateDisbursement(d: Partial<DisbursementInfo>): DraftValidationResult {
  const missing: string[] = [];
  if (!d.mpesaNumber?.trim()) missing.push('mpesaNumber');
  if (!d.confirmed) missing.push('confirmed');
  return { ok: missing.length === 0, missing };
}

export function validateAgreement(a: Partial<AgreementAcceptance>): DraftValidationResult {
  const missing: string[] = [];
  if (!a.termsAccepted) missing.push('termsAccepted');
  if (!a.signature?.trim()) missing.push('signature');
  return { ok: missing.length === 0, missing };
}

/* ------------------------------------------------------------------ */
/*  Formatting utilities                                            */
/* ------------------------------------------------------------------ */

const KES = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatKES(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return 'KES —';
  return KES.format(v);
}

/** Normalize a Kenyan phone to +2547XXXXXXXX or +2541XXXXXXXX */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  // 07XXXXXXXX or 01XXXXXXXX
  if (digits.length === 10 && /^(07|01)/.test(digits)) {
    return `+254${digits.slice(1)}`;
  }
  // 2547XXXXXXXX or 2541XXXXXXXX
  if (digits.length === 12 && digits.startsWith('254')) {
    return `+${digits}`;
  }
  // +2547XXXXXXXX (already normalized once)
  if (/^\+254(7|1)\d{8}$/.test(input)) {
    return input;
  }
  return null;
}

/** Counts down to the ISO date in DD MMM YYYY form */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}