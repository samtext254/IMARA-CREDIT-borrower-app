// imara-onlineservice/src/lib/loans.ts
//
// ─── LOANS API CLIENT ───────────────────────────────────────────
// All calls go to the auth engine proxy at /v1/imara/loans/*.
// The browser never sees a credit-engine API key.
// ────────────────────────────────────────────────────────────────

import { api } from './api';

// ─── Types (from the credit engine's response shapes) ──────────
export interface CreditLimit {
  id: string;
  max_limit: string;
  available_limit: string;
  credit_score: number | null;
  score_band: string | null;
  max_term_days: number | null;
  expires_at: string | null;
}

export interface Eligibility {
  eligible: boolean;
  credit_limit: CreditLimit | null;
}

export interface LoanProduct {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  min_amount: string;
  max_amount: string;
  min_term_days: number;
  max_term_days: number;
  default_term_days: number;
  interest_rate: string;
  interest_period: string;
  interest_method: string;
  repayment_frequency: string;
  allow_partial_prepay: boolean;
  allow_early_settlement: boolean;
}

export type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISBURSED'
  | 'ACTIVE'
  | 'OVERDUE'
  | 'PAID'
  | 'DEFAULTED'
  | 'WRITTEN_OFF';

export interface Loan {
  id: string;
  merchant_id: number;
  borrower_identity_id: string;
  loan_product_id: string;
  credit_limit_id: string | null;
  loan_reference: string;
  currency: string;

  principal_amount: string;
  interest_amount: string;
  fees_amount: string;
  penalty_amount: string;
  total_due: string;

  outstanding_principal: string;
  outstanding_interest: string;
  outstanding_fees: string;
  outstanding_penalty: string;
  outstanding_total: string;

  term_days: number;
  interest_rate: string;
  interest_period: string;
  interest_method: string;
  repayment_frequency: string;
  penalty_rate_per_day: string;
  grace_period_days: number;

  status: LoanStatus;

  requested_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  disbursed_at: string | null;
  first_due_date: string | null;
  maturity_date: string | null;
  last_payment_at: string | null;
  closed_at: string | null;

  repayment_account_number: string | null;
  disbursement_account_number: string | null;
  disbursement_transaction_id: string | null;

  originator_idempotency_key: string | null;
  disbursement_idempotency_key: string | null;

  metadata: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
}

export interface LoanScheduleEntry {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  penalty_due?: string | null;
  total_due: string;
  paid_amount: string;
  status: string;
  penalty_applied?: boolean | null;
  penalty_applied_at?: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
}

export interface Pagination {
  limit: number;
  offset: number;
  count: number;
}

// ─── Repayment intent (returned by POST /repay and GET status) ──
export type RepaymentStatus =
  | 'PENDING'
  | 'STK_SENT'
  | 'SUCCESS'
  | 'FAILED';

export interface RepaymentIntentResult {
  repayment_id: string;
  loan_id: string;
  loan_reference: string | null;
  amount: number;
  phone_number: string;
  status: RepaymentStatus;
  transaction_id: string;
  checkout_request_id: string | null;
  outstanding: {
    principal: string;
    interest: string;
    fees: string;
    penalty: string;
    total: string;
  } | null;
  replayed: boolean;
}

export interface RepaymentStatusResult {
  intent_id: string;
  status: RepaymentStatus;
  amount: number;
  checkout_request_id: string | null;
  mpesa_receipt: string | null;
  result_code: string | null;
  result_desc: string | null;
  completed_at: string | null;
  loan_repayment_id: string | null;
  new_outstanding_total: string | null;
  loan_status: LoanStatus;
  updated_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────
export function loanPrincipal(loan: Loan): string {
  return loan.principal_amount ?? '0';
}

export function loanDueDate(loan: Loan): string | null {
  return loan.maturity_date ?? loan.first_due_date ?? null;
}

// ─── Endpoints ──────────────────────────────────────────────────
export const loans = {
  getEligibility: (params?: {
    requested_amount?: string | number;
    product_id?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.requested_amount)
      qs.set('requested_amount', String(params.requested_amount));
    if (params?.product_id) qs.set('product_id', params.product_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<{ data: Eligibility }>(
      `/v1/imara/loans/eligibility${suffix}`
    );
  },

  getProduct: () =>
    api.get<{ data: LoanProduct }>('/v1/imara/loans/product'),

  getLoans: (params?: {
    status?: LoanStatus;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<{ data: Loan[]; pagination: Pagination }>(
      `/v1/imara/loans${suffix}`
    );
  },

  getLoan: (id: string) =>
    api.get<{ data: { loan: Loan; schedule: LoanScheduleEntry[] } }>(
      `/v1/imara/loans/${id}`
    ),

  apply: (data: {
    product_id: string;
    principal: string | number;
    term_days?: number;
    metadata?: Record<string, unknown>;
  }) => api.post<{ data: Loan; replayed: boolean }>('/v1/imara/loans', data),

  repay: (
    id: string,
    data: { amount: string | number; phone_number?: string }
  ) =>
    api.post<{ data: RepaymentIntentResult }>(
      `/v1/imara/loans/${id}/repay`,
      data
    ),

  getRepaymentStatus: (loanId: string, intentId: string) =>
    api.get<{ data: RepaymentStatusResult }>(
      `/v1/imara/loans/${loanId}/repayments/${intentId}/status`
    ),
};

export default loans;