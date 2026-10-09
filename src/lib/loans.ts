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

// The shape returned by the credit engine.
// NOTE: the principal field is `principal_amount`, not `principal`.
export interface Loan {
  id: string;
  merchant_id: number;
  borrower_identity_id: string;
  loan_product_id: string;
  credit_limit_id: string | null;
  loan_reference: string;
  currency: string;

  // Amounts
  principal_amount: string;
  interest_amount: string;
  fees_amount: string;
  penalty_amount: string;
  total_due: string;

  // Outstanding
  outstanding_principal: string;
  outstanding_interest: string;
  outstanding_fees: string;
  outstanding_penalty: string;
  outstanding_total: string;

  // Terms
  term_days: number;
  interest_rate: string;
  interest_period: string;
  interest_method: string;
  repayment_frequency: string;
  penalty_rate_per_day: string;
  grace_period_days: number;

  // Status
  status: LoanStatus;

  // Dates
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

  // Accounts
  repayment_account_number: string | null;
  disbursement_account_number: string | null;
  disbursement_transaction_id: string | null;

  // Idempotency
  originator_idempotency_key: string | null;
  disbursement_idempotency_key: string | null;

  // Metadata
  metadata: Record<string, unknown> | null;

  // Timestamps
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

// ─── Helpers ────────────────────────────────────────────────────
// Convenience accessor since `principal` is not the field name.
export function loanPrincipal(loan: Loan): string {
  return loan.principal_amount ?? '0';
}

export function loanDueDate(loan: Loan): string | null {
  // The credit engine exposes `maturity_date` for BULLET loans, and
  // `first_due_date` for installment loans. Prefer whichever exists.
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

  // Fetch the borrower's merchant's first active loan product.
  // The auth engine proxy resolves this from the merchant_id in
  // the session — the browser never sees a product ID until we
  // return it here.
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
    api.post<{
      data: {
        loan_id: string;
        loan_reference: string;
        outstanding: {
          principal: string;
          interest: string;
          fees: string;
          penalty: string;
          total: string;
        };
        requested_amount: string;
        phone_number: string | null;
        next_action: string;
        message: string;
      };
    }>(`/v1/imara/loans/${id}/repay`, data),
};

export default loans;