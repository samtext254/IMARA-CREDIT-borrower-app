
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, ArrowRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { imara, ImaraApiError } from '@/lib/api';
import { resolveLender } from '@/lib/lender-resolver';

function ImaraLogo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 80 80"
        className="h-12 w-12 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 65 Q38 77 72 56"
          stroke="#E9B63F"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M17 55V36L29 30V55Z" fill="#E9B63F" />
        <path d="M33 55V22L45 15V55Z" fill="#E9B63F" />
        <path d="M49 55V10L61 4V55Z" fill="#E9B63F" />
      </svg>

      <div className="leading-tight">
        <p
          className={`text-xl font-black tracking-[0.13em] ${
            light ? 'text-white' : 'text-[#102F5E]'
          }`}
        >
          IMARA
        </p>
        <p
          className={`mt-1 text-[10px] font-bold tracking-[0.24em] ${
            light ? 'text-white/80' : 'text-[#102F5E]'
          }`}
        >
          CAPITAL KENYA
        </p>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lender resolution state — preserved
  const [lender, setLender] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [, setResolvedFrom] = useState<'url' | 'storage' | 'none'>('none');

  // Form state — preserved
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Resolve lender from URL — preserved
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

    // Fall back to localStorage — preserved
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
      // Ignore storage errors
    }
  }, []);

  // Countdown timer for account lockouts — preserved
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

  // Validation — preserved
  const lenderValid = lender.trim().length >= 3;
  const merchantIdValid =
    !!merchantId.trim() && !isNaN(parseInt(merchantId.trim(), 10));

  const identifierValid = lenderValid || merchantIdValid;
  const identifierMissing = !identifierValid;

  const emailInvalid = submitted && !email.trim();
  const passwordInvalid = submitted && password.length < 8;
  const identifierInvalid = submitted && identifierMissing;

  // Authentication logic — preserved
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    setRetryAfter(null);

    if (!email.trim() || password.length < 8) return;

    // Prefer lender slug over merchantId
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

      // Persist identifier — preserved
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
        // Ignore storage errors
      }

      // OTP verification redirect — preserved
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

  // Forgot password URL — preserved
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
    <main className="min-h-screen bg-[#F5F7FB] font-sans text-[#102F5E]">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT: BRAND PANEL */}
        <section className="relative isolate flex min-h-[270px] flex-col overflow-hidden bg-[#102F5E] px-6 py-7 sm:px-10 sm:py-10 lg:min-h-screen lg:justify-between lg:px-14 lg:py-12 xl:px-20">
          {/* Decorative background */}
          <div className="pointer-events-none absolute -right-28 -top-24 -z-10 h-80 w-80 rounded-full border-[45px] border-white/[0.04]" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 -z-10 h-96 w-96 rounded-full border-[55px] border-white/[0.04]" />
          <div className="pointer-events-none absolute right-10 top-1/3 -z-10 h-44 w-44 rounded-full bg-[#E9B63F]/10 blur-3xl" />

          <div>
            <ImaraLogo light />

            <div className="mt-10 max-w-xl sm:mt-14 lg:mt-24">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F3C34F] sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-[#E9B63F]" />
                Your goals. Our support.
              </div>

              <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
                Welcome back.
                <span className="mt-2 block text-[#F3C34F]">
                  Your next step starts here.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
                Access your Imara account to continue your financial journey,
                manage your loan activities and stay up to date with your
                account.
              </p>
            </div>
          </div>

          {/* Brand highlights */}
          <div className="mt-10 hidden max-w-xl grid-cols-1 gap-4 sm:grid sm:grid-cols-3 lg:mt-16">
            {[
              {
                title: 'Convenient access',
                description: 'Access your account online.',
              },
              {
                title: 'Simple process',
                description: 'Follow clear application steps.',
              },
              {
                title: 'Account support',
                description: 'Get help when you need it.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-white/[0.05] p-4"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#E9B63F]/15 text-[#F3C34F]">
                  <ShieldCheck size={19} />
                </div>
                <h2 className="text-xs font-bold text-white">
                  {item.title}
                </h2>
                <p className="mt-2 text-[11px] leading-5 text-white/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 hidden text-xs text-white/45 lg:block">
            © {new Date().getFullYear()} Imara Capital Kenya. All rights reserved.
          </p>
        </section>

        {/* RIGHT: LOGIN FORM */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-10 sm:py-14 lg:px-12 xl:px-20">
          <div className="w-full max-w-[440px]">

            {/* Mobile brand */}
            <div className="mb-8 lg:hidden">
              <ImaraLogo />
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_18px_60px_rgba(16,47,94,0.07)] sm:p-9 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="mb-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF2D2] text-[#102F5E]">
                  <LockKeyhole size={27} strokeWidth={1.8} />
                </div>

                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#B78319]">
                  SECURE ACCOUNT ACCESS
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#102F5E] sm:text-4xl">
                  Sign in
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Enter your account details below to continue to your Imara
                  account.
                </p>
              </div>

              <form onSubmit={onSubmit} noValidate>
                <div className="space-y-5">

                  {/* Lender fallback — preserved */}
                  {identifierMissing && (
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold text-[#102F5E]">
                        Lender code
                      </span>

                      <Input
                        className={`h-12 rounded-xl border-slate-200 bg-white px-4 text-sm focus-visible:ring-[#E9B63F]/40 ${
                          identifierInvalid
                            ? 'border-red-300 focus-visible:ring-red-300'
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
                        <p className="mt-2 text-xs font-medium text-red-600">
                          Enter your lender&apos;s code from your invitation.
                        </p>
                      )}

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Enter the lender code provided to you.
                      </p>
                    </label>
                  )}

                  {/* Email */}
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#102F5E]">
                      Email address
                    </span>

                    <Input
                      className={`h-12 rounded-xl border-slate-200 bg-white px-4 text-sm placeholder:text-slate-400 focus-visible:ring-[#E9B63F]/40 ${
                        emailInvalid
                          ? 'border-red-300 focus-visible:ring-red-300'
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
                      <p className="mt-2 text-xs font-medium text-red-600">
                        Enter your email address.
                      </p>
                    )}
                  </label>

                  {/* Password */}
                  <label className="block">
                    <span className="mb-2 block text-xs font-bold text-[#102F5E]">
                      Password
                    </span>

                    <div className="relative">
                      <Input
                        className={`h-12 rounded-xl border-slate-200 bg-white px-4 pr-12 text-sm placeholder:text-slate-400 focus-visible:ring-[#E9B63F]/40 ${
                          passwordInvalid
                            ? 'border-red-300 focus-visible:ring-red-300'
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
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-[#102F5E]"
                      >
                        {showPassword ? (
                          <EyeOff size={19} strokeWidth={1.9} />
                        ) : (
                          <Eye size={19} strokeWidth={1.9} />
                        )}
                      </button>
                    </div>

                    {passwordInvalid && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        Password must be at least 8 characters.
                      </p>
                    )}
                  </label>

                  {/* Forgot password — preserved */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => router.push(forgotPasswordHref())}
                      className="text-xs font-bold text-[#102F5E] transition hover:text-[#B78319]"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* API errors and lockout countdown — preserved */}
                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
                    >
                      {error}

                      {retryAfter !== null && retryAfter > 0 && (
                        <span className="mt-1 block text-xs font-normal text-red-600">
                          Try again in {retryAfter}s
                        </span>
                      )}
                    </div>
                  )}

                  {/* Submit — same login action */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={busy || (retryAfter !== null && retryAfter > 0)}
                      size="lg"
                      className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[#102F5E] text-sm font-extrabold text-white shadow-md shadow-[#102F5E]/15 transition hover:bg-[#173F78] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign in to your account
                          <ArrowRight size={18} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Support message */}
              <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">
                  Need an account?
                </p>
                <p className="mt-1 text-sm font-semibold text-[#102F5E]">
                  Contact your support team.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={15} />
                <span>Your account access is protected.</span>
              </div>
            </div>

            <p className="mt-7 text-center text-xs text-slate-400 lg:hidden">
              © {new Date().getFullYear()} Imara Capital Kenya.
              All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E9B63F] border-t-[#102F5E]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
