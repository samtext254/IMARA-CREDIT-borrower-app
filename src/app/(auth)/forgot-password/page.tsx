'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { imara, ImaraApiError } from '@/lib/api';
import { resolveLender } from '@/lib/lender-resolver';

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [lender, setLender] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Resolve lender from URL, localStorage, or manual
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resolved = resolveLender({
      search: window.location.search,
      pathname: window.location.pathname,
      hostname: window.location.hostname,
    });

    if (resolved.lender) {
      setLender(resolved.lender);
      return;
    }
    if (resolved.merchantId) {
      setMerchantId(String(resolved.merchantId));
      return;
    }

    try {
      const storedLender = window.localStorage.getItem('imara.lender');
      const storedMerchant = window.localStorage.getItem('imara.merchantId');
      if (storedLender) setLender(storedLender);
      else if (storedMerchant) setMerchantId(storedMerchant);
    } catch {
      /* ignore */
    }
  }, []);

  const lenderValid = lender.trim().length >= 3;
  const merchantIdValid =
    !!merchantId.trim() && !isNaN(parseInt(merchantId.trim(), 10));
  const identifierValid = lenderValid || merchantIdValid;

  const emailInvalid = submitted && !email.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);

    if (!email.trim()) return;

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
      await imara.forgotPassword({
        email: email.trim(),
        ...(useLender
          ? { lender: lender.trim().toLowerCase() }
          : { merchantId: numericMerchantId as number }),
      });

      setSent(true);
    } catch (err) {
      if (err instanceof ImaraApiError) {
        if (err.code === 'RATE_LIMITED') {
          setError(err.message);
        } else {
          // The endpoint returns 200 with a generic message even on
          // unknown email. Anything else is unexpected.
          setError(err.message || 'Could not send reset email.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative overflow-hidden rounded-b-[32px] bg-plum-800 px-6 pt-8 pb-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-plum-700/60 blur-3xl" />
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="relative grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
          >
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <h1 className="relative mt-5 text-[26px] font-bold leading-tight tracking-tight text-white">
            Check your email
          </h1>
          <p className="relative mt-2 max-w-[18rem] text-[12.5px] font-medium leading-snug text-white/70">
            If <span className="font-semibold text-brand-500">{email}</span> matches
            our records, you&apos;ll receive a password reset email shortly.
          </p>
        </div>

        <div className="px-6 pt-8 pb-10">
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-50 text-plum-700">
              <Mail size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Email address
              </p>
              <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink-950">
                {email}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full"
            size="lg"
          >
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative overflow-hidden rounded-b-[32px] bg-plum-800 px-6 pt-8 pb-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-plum-700/60 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-20 h-48 w-48 rounded-full bg-plum-900/50 blur-3xl" />

        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="relative grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
        >
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>

        <h1 className="relative mt-5 text-[26px] font-bold leading-tight tracking-tight text-white">
          Forgot password?
        </h1>
        <p className="relative mt-2 max-w-[18rem] text-[12.5px] font-medium leading-snug text-white/70">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={onSubmit} className="px-6 pt-8 pb-10">
        <div className="space-y-4">
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

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11.5px] font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={busy || !identifierValid}
              className="w-full"
              size="lg"
            >
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-[10.5px] font-medium leading-snug text-ink-400">
          Remembered it?{' '}
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="font-semibold text-plum-700"
          >
            Back to login
          </button>
        </p>
      </form>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}