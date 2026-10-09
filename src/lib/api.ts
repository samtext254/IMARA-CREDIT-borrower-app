// imara-onlineservice/src/lib/api.ts
//
// ─── IMARA API CLIENT ──────────────────────────────────────────
// Single point of contact between the Imara frontend and the
// XecoFlow backend. All requests to /v1/imara/* go through here.
//
// Key features:
//   - Sends cookies via credentials: 'include'
//   - Attaches X-Client-Id header for logging
//   - Automatically refreshes the session on 401 TOKEN_EXPIRED
//   - Deduplicates concurrent refreshes via a shared promise
//   - Notifies the app when the session is dead (via setSessionEndedHandler)
// ────────────────────────────────────────────────────────────────

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009';
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || 'imara';

// ─── TYPES ──────────────────────────────────────────────────────
export interface ApiError {
  success: false;
  code: string;
  message: string;
  retryAfter?: number;
}

export class ImaraApiError extends Error {
  code: string;
  status: number;
  retryAfter?: number;

  constructor(status: number, body: ApiError) {
    super(body.message || 'Request failed');
    this.name = 'ImaraApiError';
    this.status = status;
    this.code = body.code || 'UNKNOWN';
    this.retryAfter = body.retryAfter;
  }
}

export type SessionEndedReason =
  | 'REFRESH_FAILED'
  | 'TOKEN_REUSE_DETECTED'
  | 'TOKEN_EXPIRED'
  | 'SESSION_ABSOLUTE_EXPIRED'
  | 'SESSION_IDLE_EXPIRED'
  | 'SESSION_NOT_FOUND'
  | 'TOKEN_BLACKLISTED';

// ─── SESSION-ENDED CALLBACK ─────────────────────────────────────
let onSessionEnded: ((reason: SessionEndedReason) => void) | null = null;

export function setSessionEndedHandler(
  handler: (reason: SessionEndedReason) => void
) {
  onSessionEnded = handler;
}

// ─── REFRESH DEDUPLICATION ──────────────────────────────────────
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/v1/imara/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': CLIENT_ID,
        },
      });

      if (response.ok) {
        return true;
      }

      let body: any = {};
      try {
        body = await response.json();
      } catch {
        body = {};
      }

      const reason: SessionEndedReason =
        body.code === 'TOKEN_REUSE_DETECTED'
          ? 'TOKEN_REUSE_DETECTED'
          : body.code === 'TOKEN_EXPIRED'
          ? 'TOKEN_EXPIRED'
          : 'REFRESH_FAILED';

      onSessionEnded?.(reason);
      return false;
    } catch {
      onSessionEnded?.('REFRESH_FAILED');
      return false;
    } finally {
      setTimeout(() => {
        refreshInFlight = null;
      }, 50);
    }
  })();

  return refreshInFlight;
}

// ─── CORE FETCH WRAPPER ─────────────────────────────────────────
async function request<T = any>(
  path: string,
  options: RequestInit = {},
  attempt: number = 1
): Promise<T> {
  const url = `${API_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CLIENT_ID,
        ...(options.headers || {}),
      },
    });
  } catch (networkError) {
    throw networkError;
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = {
      success: false,
      code: 'NON_JSON_RESPONSE',
      message: `Server returned ${response.status} with non-JSON body.`,
    };
  }

  if (response.ok) {
    return body as T;
  }

  // ─── Auth endpoints never trigger refresh ───────────────────
  const isAuthEndpoint =
    path.startsWith('/v1/imara/auth/login') ||
    path.startsWith('/v1/imara/auth/verify-otp') ||
    path.startsWith('/v1/imara/auth/resend-otp') ||
    path.startsWith('/v1/imara/auth/otp-context') ||
    path.startsWith('/v1/imara/auth/refresh') ||
    path.startsWith('/v1/imara/auth/forgot-password') ||
    path.startsWith('/v1/imara/auth/reset-password');

  const shouldTryRefresh =
    response.status === 401 &&
    attempt === 1 &&
    !isAuthEndpoint &&
    body?.code !== 'TOKEN_REUSE_DETECTED';

  if (shouldTryRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, options, attempt + 1);
    }
  }

  if (
    body?.code === 'TOKEN_REUSE_DETECTED' ||
    body?.code === 'SESSION_ABSOLUTE_EXPIRED' ||
    body?.code === 'SESSION_IDLE_EXPIRED' ||
    body?.code === 'SESSION_NOT_FOUND' ||
    body?.code === 'TOKEN_BLACKLISTED'
  ) {
    onSessionEnded?.(body.code as SessionEndedReason);
  }

  throw new ImaraApiError(response.status, body);
}

// ─── HTTP VERBS ─────────────────────────────────────────────────
export const api = {
  get: <T = any>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T = any>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T = any>(path: string, data?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T = any>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// ─── IMARA-SPECIFIC ENDPOINTS ───────────────────────────────────
export const imara = {
  // ─── AUTH ───────────────────────────────────────────────────
  login: (data: {
    email: string;
    password: string;
    merchantId?: number;
    lender?: string;
  }) =>
    api.post<{ success: true; requiresOTP: true; expiresIn: number }>(
      '/v1/imara/auth/login',
      data
    ),

  verifyOtp: (code: string) =>
    api.post<
      | { success: true; requiresPasswordReset?: false }
      | {
          success: true;
          requiresPasswordReset: true;
          resetToken: string;
          email: string;
        }
    >('/v1/imara/auth/verify-otp', { code }),

  resendOtp: () =>
    api.post<{ success: true; expiresAt: number }>(
      '/v1/imara/auth/resend-otp'
    ),

  otpContext: () =>
    api.get<{ maskedEmail: string; expiresAt: number }>(
      '/v1/imara/auth/otp-context'
    ),

  logout: () =>
    api.post<{ success: true; message: string }>('/v1/imara/auth/logout'),

  refresh: () =>
    api.post<{
      success: true;
      sessionInfo: { expiresIn: number; expiresAt: string };
    }>('/v1/imara/auth/refresh'),

  me: () =>
    api.get<{
      success: true;
      data: {
        borrower_id: number;
        merchant_id: number;
        email: string;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        status: string;
        email_verified: boolean;
        must_change_password: boolean;
        created_at: string;
      };
      sessionInfo: { remaining: number };
    }>('/v1/imara/auth/me'),

  forgotPassword: (data: {
    email: string;
    merchantId?: number;
    lender?: string;
  }) =>
    api.post<{ success: true; message: string }>(
      '/v1/imara/auth/forgot-password',
      data
    ),

  resetPassword: (data: {
    token?: string;
    resetToken?: string;
    email?: string;
    newPassword: string;
    merchantId?: number;
    lender?: string;
  }) =>
    api.post<{ success: true; message: string }>(
      '/v1/imara/auth/reset-password',
      data
    ),

  verifyEmail: (token: string) =>
    api.post<{ success: true; message: string }>(
      '/v1/imara/auth/verify-email',
      { token }
    ),
};