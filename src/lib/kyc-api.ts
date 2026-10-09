// src/lib/kyc-api.ts
// Typed client for the Imara borrower KYC endpoints.
// All calls go to the auth engine at NEXT_PUBLIC_API_URL.
//
// Backend routes (mounted at /v1/imara/kyc):
//   GET  /status                       — current KYC state + progress
//   POST /submit                       — submit the KYC form
//
// These two endpoints are borrower-facing. The merchant-side
// endpoints (/admin/*) are called by the xecoflow-pay dashboard,
// not by the borrower app.

// ─── Types ───────────────────────────────────────────────────────

export type KycStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export type EmploymentStatus =
  | 'EMPLOYED'
  | 'SELF_EMPLOYED'
  | 'BUSINESS_OWNER'
  | 'STUDENT'
  | 'RETIRED'
  | 'UNEMPLOYED';

export type IncomeRange = 'BELOW_5000' | 'ABOVE_5000';

export interface KycProgress {
  percentage: number;
  filled: number;
  total: number;
  missing: string[];
}

export interface KycPrefilled {
  full_name: string | null;
  national_id: string | null;
  phone: string | null;
}

export interface KycSubmittedFields {
  date_of_birth: string | null;
  county: string | null;
  town: string | null;
  street_address: string | null;
  employment_status: EmploymentStatus | null;
  monthly_income_range: IncomeRange | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
}

export interface KycCreditLimit {
  maxLimit: number;
  availableLimit: number;
  currency: string;
  status: string;
}

export interface KycConstants {
  employmentStatuses: EmploymentStatus[];
  incomeRanges: IncomeRange[];
}

export interface KycStatusResponse {
  kycStatus: KycStatus;
  progress: KycProgress;
  prefilled: KycPrefilled;
  submittedFields: KycSubmittedFields;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  creditLimit: KycCreditLimit | null;
  constants: KycConstants;
}

export interface KycSubmitPayload {
  date_of_birth: string;
  county: string;
  town: string;
  street_address: string;
  employment_status: EmploymentStatus;
  monthly_income_range: IncomeRange;
  next_of_kin_name: string;
  next_of_kin_phone: string;
  next_of_kin_relationship?: string;
}

export interface KycSubmitResponse {
  kycStatus: KycStatus;
  submittedAt: string;
}

export interface KycValidationErrors {
  [field: string]: string;
}

// ─── Error class ─────────────────────────────────────────────────

export class KycApiError extends Error {
  code: string;
  status?: number;
  errors?: KycValidationErrors;

  constructor(
    message: string,
    code: string,
    status?: number,
    errors?: KycValidationErrors
  ) {
    super(message);
    this.name = 'KycApiError';
    this.code = code;
    this.status = status;
    this.errors = errors;
  }
}

// ─── Core fetch wrapper ──────────────────────────────────────────

const API_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  'http://localhost:3009';

async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${API_URL.replace(/\/+$/, '')}/v1/imara/kyc${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Id': 'imara',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
    cache: 'no-store',
  });

  let raw: any = null;
  try {
    raw = await res.json();
  } catch {
    raw = null;
  }

  if (!res.ok) {
    const code = raw?.code || raw?.error?.code || `HTTP_${res.status}`;
    const message =
      raw?.message ||
      raw?.error?.message ||
      res.statusText ||
      'Request failed';
    throw new KycApiError(message, code, res.status, raw?.errors);
  }

  return raw as T;
}

// ─── Borrower endpoints ──────────────────────────────────────────

/**
 * Fetch the borrower's current KYC status, progress, prefilled
 * fields, submitted fields, and current credit limit.
 *
 * Called on the home page (for the modal), on the profile page
 * (for the KYC card), and on the apply page (for the gate).
 */
export async function getKycStatus(): Promise<KycStatusResponse> {
  const raw = await call<{ success: boolean; data: KycStatusResponse }>(
    'GET',
    '/status'
  );
  return raw.data;
}

/**
 * Submit the KYC form. On success the borrower's kyc_status flips
 * to SUBMITTED and the merchant sees it in their review queue.
 *
 * Throws KycApiError with .errors populated if server-side
 * validation fails.
 */
export async function submitKyc(
  payload: KycSubmitPayload
): Promise<KycSubmitResponse> {
  const raw = await call<{
    success: boolean;
    data: KycSubmitResponse;
    message: string;
  }>('POST', '/submit', payload);
  return raw.data;
}

// ─── Display helpers ─────────────────────────────────────────────

const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  EMPLOYED: 'Employed',
  SELF_EMPLOYED: 'Self-employed',
  BUSINESS_OWNER: 'Business owner',
  STUDENT: 'Student',
  RETIRED: 'Retired',
  UNEMPLOYED: 'Unemployed',
};

const INCOME_LABELS: Record<IncomeRange, string> = {
  BELOW_5000: 'Below KES 5,000',
  ABOVE_5000: 'KES 5,000 and above',
};

export function employmentLabel(value: EmploymentStatus | string | null): string {
  if (!value) return '—';
  return EMPLOYMENT_LABELS[value as EmploymentStatus] || value;
}

export function incomeLabel(value: IncomeRange | string | null): string {
  if (!value) return '—';
  return INCOME_LABELS[value as IncomeRange] || value;
}

export function kycStatusLabel(value: KycStatus): string {
  switch (value) {
    case 'PENDING':
      return 'Not submitted';
    case 'SUBMITTED':
      return 'Under review';
    case 'VERIFIED':
      return 'Verified';
    case 'REJECTED':
      return 'Rejected';
    default:
      return value;
  }
}

export function formatKes(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return 'KES 0';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return 'KES 0';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}