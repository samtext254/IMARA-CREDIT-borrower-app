'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imara, ImaraApiError } from '@/lib/api';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

/* ------------------------------------------------------------------ */
/*  Six single-digit boxes                                             */
/* ------------------------------------------------------------------ */
function OtpBoxes({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '');

  function focusIndex(i: number) {
    const el = inputsRef.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  }

  function setDigitAt(i: number, d: string) {
    const clean = d.replace(/\D/g, '').slice(-1);
    const next = (value.slice(0, i) + clean + value.slice(i + 1)).slice(
      0,
      CODE_LENGTH
    );
    onChange(next);
    if (clean) {
      const nextIndex = Math.min(i + 1, CODE_LENGTH - 1);
      setTimeout(() => focusIndex(nextIndex), 0);
    }
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) {
        const next = value.slice(0, i) + value.slice(i + 1);
        onChange(next);
      } else if (i > 0) {
        const next = value.slice(0, i - 1) + value.slice(i);
        onChange(next);
        focusIndex(i - 1);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (e.key === 'ArrowRight' && i < CODE_LENGTH - 1) {
      e.preventDefault();
      focusIndex(i + 1);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    const last = Math.min(pasted.length, CODE_LENGTH) - 1;
    setTimeout(() => focusIndex(last), 0);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={d}
          onChange={(e) => setDigitAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className={`h-14 w-12 rounded-xl border bg-white text-center text-[20px] font-bold tracking-tight text-ink-950 outline-none transition ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
              : 'border-ink-100 focus:border-plum-700 focus:ring-2 focus:ring-plum-500/30'
          } disabled:opacity-60`}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Verify form                                                        */
/* ------------------------------------------------------------------ */
function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const emailFromUrl = params.get('email') || '';

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [resent, setResent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  // ─── Fetch OTP context on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await imara.otpContext();
        if (!cancelled) {
          setMaskedEmail(res.maskedEmail);
          setExpiresAt(res.expiresAt);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ImaraApiError) {
          if (err.code === 'OTP_NOT_FOUND' || err.code === 'OTP_EXPIRED') {
            router.replace('/login');
            return;
          }
        }
        // Network error — leave the page visible so the user can retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (code.length === CODE_LENGTH && !submitting) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await imara.verifyOtp(code);

      // ─── Forced password change path ─────────────────────
      // The backend did not issue a session because this borrower
      // is still on a temp password. Route to /reset-password
      // with the short-lived resetToken.
      if (res.requiresPasswordReset) {
        const params = new URLSearchParams({
          token: res.resetToken,
          email: res.email,
        });
        router.replace(`/reset-password?${params.toString()}`);
        return;
      }

      router.push('/home');
    } catch (err) {
      if (err instanceof ImaraApiError) {
        switch (err.code) {
          case 'INVALID_OTP':
            setError('That code is incorrect. Please try again.');
            break;
          case 'OTP_EXPIRED':
            setError('Your code has expired. Request a new one.');
            break;
          case 'OTP_ATTEMPTS_EXCEEDED':
            setError(
              'Too many incorrect attempts. Please request a new code.'
            );
            break;
          case 'OTP_NOT_FOUND':
            // The temporary session is gone — send them back to login.
            router.replace('/login');
            return;
          case 'RATE_LIMITED':
            setError(err.message);
            break;
          default:
            setError(err.message || 'Verification failed. Please try again.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
      setCode('');
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (secondsLeft > 0) return;
    setError(null);
    try {
      const res = await imara.resendOtp();
      setExpiresAt(res.expiresAt);
      setResent(true);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setTimeout(() => setResent(false), 2500);
    } catch (err) {
      if (err instanceof ImaraApiError) {
        if (err.code === 'OTP_NOT_FOUND') {
          router.replace('/login');
          return;
        }
        if (err.code === 'RATE_LIMITED') {
          const wait = err.retryAfter ?? RESEND_COOLDOWN_SECONDS;
          setSecondsLeft(wait);
          setError(err.message);
          return;
        }
      }
      setError('Could not resend the code. Please try again.');
    }
  }

  const fullCode = code.length === CODE_LENGTH;
  const displayEmail = maskedEmail || emailFromUrl || 'your email';

  return (
    <div className="min-h-screen bg-white">
      {/* ============ HERO HEADER ============ */}
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
          Verify your email
        </h1>
        <p className="relative mt-2 max-w-[18rem] text-[12.5px] font-medium leading-snug text-white/70">
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-brand-500">{displayEmail}</span>.
        </p>
      </div>

      {/* ============ FORM ============ */}
      <div className="px-6 pt-8 pb-10">
        {/* Email preview chip */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-50 text-plum-700">
            <Mail size={16} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Sent to
            </p>
            <p className="mt-0.5 truncate text-[12.5px] font-semibold text-ink-950">
              {displayEmail}
            </p>
          </div>
        </div>

        {/* Code entry */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Verification code
          </p>

          <OtpBoxes
            value={code}
            onChange={(v) => {
              setError(null);
              setCode(v);
            }}
            disabled={submitting}
            error={!!error}
          />

          {error && (
            <p className="mt-3 text-[11.5px] font-medium text-red-600">
              {error}
            </p>
          )}

          {resent && (
            <p className="mt-3 text-[11.5px] font-medium text-leaf-600">
              A new code has been sent.
            </p>
          )}
        </div>

        {/* Resend line */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-[11.5px] text-ink-500">
            Didn&apos;t get the code?
          </p>
          <button
            type="button"
            onClick={onResend}
            disabled={secondsLeft > 0}
            className={`text-[12px] font-semibold transition ${
              secondsLeft > 0
                ? 'text-ink-400'
                : 'text-plum-700 active:opacity-70'
            }`}
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
          </button>
        </div>

        {/* Verify button */}
        <div className="mt-8">
          <Button
            type="button"
            onClick={submit}
            disabled={submitting || !fullCode}
            className="w-full"
            size="lg"
          >
            {submitting ? 'Verifying…' : 'Verify'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white px-6 pt-8 text-[12px] text-ink-500">
          Loading…
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}