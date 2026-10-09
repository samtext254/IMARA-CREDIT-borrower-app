'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { imara, ImaraApiError } from '@/lib/api';
import { resolveLender } from '@/lib/lender-resolver';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // ─── Lender resolution state ────────────────────────────────
  // Populated by resolveLender() from URL or by the user typing.
  const [lender, setLender] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [resolvedFrom, setResolvedFrom] = useState<
    'url' | 'storage' | 'none'
  >('none');

  // ─── Form state ─────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // ─── Resolve lender from URL on mount ───────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resolved = resolveLender({
      search: window.location.search,
      pathname: window.location.pathname,
      hostname: window.location.hostname,
    });

    if (resolved.lender) {
      setLender(resolved.lender);
      setResolvedFrom('url');
      return;
    }
    if (resolved.merchantId) {
      setMerchantId(String(resolved.merchantId));
      setResolvedFrom('url');
      return;
    }

    // ─── Fall back to localStorage ────────────────────────────
    try {
      const storedLender = window.localStorage.getItem('imara.lender');
      const storedMerchant = window.localStorage.getItem('imara.merchantId');
      if (storedLender) {
        setLender(storedLender);
        setResolvedFrom('storage');
      } else if (storedMerchant) {
        setMerchantId(storedMerchant);
        setResolvedFrom('storage');
      }
    } catch {
      /* ignore quota errors */
    }
  }, []);

  // ─── Countdown timer for lockouts ───────────────────────────
  useEffect(() => {
    if (retryAfter === null || retryAfter <= 0) return;
    const id = setInterval(() => {
      setRetryAfter((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  // ─── Derived validation state ───────────────────────────────
  const lenderValid = lender.trim().length >= 3;
  const merchantIdValid =
    !!merchantId.trim() && !isNaN(parseInt(merchantId.trim(), 10));
  const identifierValid = lenderValid || merchantIdValid;
  const identifierMissing = !identifierValid;

  const emailInvalid = submitted && !email.trim();
  const passwordInvalid = submitted && password.length < 8;
  const identifierInvalid = submitted && identifierMissing;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setRetryAfter(null);

    if (!email.trim() || password.length < 8) return;

    // Prefer lender slug over merchantId when both could apply.
    const useLender = lender.trim().length >= 3;
    const numericMerchantId = useLender
      ? null
      : parseInt(merchantId.trim(), 10);

    if (
      !useLender &&
      (numericMerchantId === null || isNaN(numericMerchantId))
    ) {
      return;
    }

    setBusy(true);
    try {
      await imara.login({
        email: email.trim(),
        password,
        ...(useLender
          ? { lender: lender.trim().toLowerCase() }
          : { merchantId: numericMerchantId as number }),
      });

      // Persist whichever identifier we used, so the next launch
      // (including a PWA cold start or a session-expiry redirect)
      // can pre-fill the correct lender.
      try {
        if (useLender) {
          window.localStorage.setItem(
            'imara.lender',
            lender.trim().toLowerCase()
          );
          window.localStorage.removeItem('imara.merchantId');
        } else {
          window.localStorage.setItem(
            'imara.merchantId',
            String(numericMerchantId)
          );
          window.localStorage.removeItem('imara.lender');
        }
      } catch {
        /* ignore quota errors */
      }

      // Hand off to the OTP step. The imara_otp cookie is already set.
      router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      if (err instanceof ImaraApiError) {
        switch (err.code) {
          case 'ACCOUNT_LOCKED':
            setError(err.message);
            if (err.retryAfter) setRetryAfter(err.retryAfter);
            break;
          case 'ACCOUNT_NOT_VERIFIED':
            setError(
              'Your email is not verified yet. Check your inbox for the verification link.'
            );
            break;
          case 'ACCOUNT_NOT_ACTIVE':
            setError(
              'Your account is not active. Please contact your lender.'
            );
            break;
          case 'RATE_LIMITED':
            setError(err.message);
            if (err.retryAfter) setRetryAfter(err.retryAfter);
            break;
          case 'INVALID_CREDENTIALS':
          default:
            setError('Invalid email or password.');
        }
      } else {
        setError(
          err instanceof Error ? err.message : 'Something went wrong'
        );
      }
    } finally {
      setBusy(false);
    }
  }

  // ─── Build the "forgot password" URL, preserving lender ────
  function forgotPasswordHref(): string {
    const params = new URLSearchParams();
    if (lender.trim()) {
      params.set('lender', lender.trim().toLowerCase());
    } else if (merchantId.trim()) {
      params.set('m', merchantId.trim());
    }
    const qs = params.toString();
    return `/forgot-password${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ============ HERO HEADER ============ */}
      <div className="relative overflow-hidden rounded-b-[32px] bg-plum-800 px-6 pt-8 pb-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-plum-700/60 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-20 h-48 w-48 rounded-full bg-plum-900/50 blur-3xl" />

        <h1 className="relative text-[30px] font-bold leading-none tracking-tight text-white">
          Login
        </h1>
        <p className="relative mt-2 text-[12.5px] font-medium leading-snug text-white/70">
          Sign in to access your{' '}
          <span className="font-semibold text-brand-500">IMARA CREDIT</span>{' '}
          account.
        </p>
      </div>

      {/* ============ FORM ============ */}
      <form onSubmit={onSubmit} className="px-6 pt-8 pb-10">
        <div className="space-y-4">

          {/* Lender — only shown when we could not resolve it
              from the URL or from localStorage. This is the
              absolute fallback and only appears on a fresh
              device with no stored lender. */}
          {identifierMissing && (
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Lender
              </span>
              <Input
                className={`mt-1.5 ${
                  identifierInvalid
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                    : ''
                }`}
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. acme-loans"
                value={lender}
                onChange={(e) => {
                  setError(null);
                  setLender(e.target.value);
                }}
              />
              {identifierInvalid && (
                <p className="mt-1 text-[11px] font-medium text-red-600">
                  Enter your lender&apos;s code from your invitation
                </p>
              )}
            </label>
          )}

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Email
            </span>
            <Input
              className={`mt-1.5 ${
                emailInvalid
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                  : ''
              }`}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="yourname@gmail.com"
              value={email}
              onChange={(e) => {
                setError(null);
                setEmail(e.target.value);
              }}
            />
            {emailInvalid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">
                Enter your email
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Password
            </span>
            <div className="relative mt-1.5">
              <Input
                className={`pr-12 ${
                  passwordInvalid
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                    : ''
                }`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setError(null);
                  setPassword(e.target.value);
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-ink-400 transition active:scale-95"
              >
                {showPassword ? (
                  <EyeOff size={17} strokeWidth={2.2} />
                ) : (
                  <Eye size={17} strokeWidth={2.2} />
                )}
              </button>
            </div>
            {passwordInvalid && (
              <p className="mt-1 text-[11px] font-medium text-red-600">
                Password must be at least 8 characters
              </p>
            )}
          </label>

          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => router.push(forgotPasswordHref())}
              className="text-[12px] font-semibold text-plum-700 transition active:opacity-70"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11.5px] font-medium text-red-700">
              {error}
              {retryAfter !== null && retryAfter > 0 && (
                <span className="block mt-0.5 text-[10.5px] font-normal text-red-600">
                  Try again in {retryAfter}s
                </span>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={busy || (retryAfter !== null && retryAfter > 0)}
              className="w-full"
              size="lg"
            >
              {busy ? 'Signing in…' : 'Login'}
            </Button>
          </div>

        </div>

        <p className="mt-8 text-center text-[10.5px] font-medium leading-snug text-ink-400">
          Need an account? Contact your support.
        </p>
      </form>
    </div>
  );
}

// ─── WRAP IN SUSPENSE (useSearchParams requirement) ─────────────
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}