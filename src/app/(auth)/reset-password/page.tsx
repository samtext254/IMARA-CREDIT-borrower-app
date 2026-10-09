'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { imara, ImaraApiError } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';
  const lenderFromUrl = searchParams.get('lender') || '';
  const merchantIdFromUrl =
    searchParams.get('m') || searchParams.get('merchantId') || '';

  // ─── Which flow are we in? ──────────────────────────────────────
  // Forced reset:   coming from /verify after OTP on a temp password.
  //                 URL has `token` + `email`, no lender.
  // Forgot-password: coming from the reset email link.
  //                 URL has `token` + `email` + `lender`.
  // Rule: presence of lender or merchantId = forgot-password flow.
  const isForcedReset = !lenderFromUrl && !merchantIdFromUrl;

  const [email, setEmail] = useState(emailFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Token is required in both flows. Email is only required for
  // the forgot-password flow (where the backend needs to match the
  // reset link to a specific borrower).
  const linkInvalid = !token;

  // Store the lender so future logins know where to go.
  useEffect(() => {
    if (!lenderFromUrl && !merchantIdFromUrl) return;
    try {
      if (lenderFromUrl) {
        window.localStorage.setItem('imara.lender', lenderFromUrl);
      } else if (merchantIdFromUrl) {
        window.localStorage.setItem('imara.merchantId', merchantIdFromUrl);
      }
    } catch {
      /* ignore */
    }
  }, [lenderFromUrl, merchantIdFromUrl]);

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const passwordsDiffer =
    confirmPassword.length > 0 && confirmPassword !== newPassword;

  // Email is only required in the forgot-password flow.
  const emailOk = isForcedReset ? true : !!email.trim();

  const readyToSubmit =
    emailOk &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !busy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!readyToSubmit) return;

    setBusy(true);
    try {
      if (isForcedReset) {
        // ─── Forced reset (from OTP on temp password) ───────
        // The backend expects `resetToken` and `newPassword`.
        // On success it issues the session cookies.
        await imara.resetPassword({
          resetToken: token,
          newPassword,
        });

        // Session is now live. Go straight to the dashboard.
        router.replace('/home');
        return;
      }

      // ─── Forgot-password reset (email link) ────────────
      await imara.resetPassword({
        token,
        email: email.trim(),
        newPassword,
        ...(lenderFromUrl
          ? { lender: lenderFromUrl }
          : { merchantId: parseInt(merchantIdFromUrl, 10) }),
      });

      // No session. Show the confirmation screen.
      setDone(true);
    } catch (err) {
      if (err instanceof ImaraApiError) {
        switch (err.code) {
          case 'RESET_TOKEN_INVALID':
            setError('This reset link is invalid. Please request a new one.');
            break;
          case 'RESET_TOKEN_EXPIRED':
            setError('This reset link has expired. Please request a new one.');
            break;
          case 'WEAK_PASSWORD':
            setError(err.message);
            break;
          case 'INVALID_REQUEST':
            setError(err.message);
            break;
          default:
            setError(err.message || 'Could not reset password.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (linkInvalid) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative overflow-hidden rounded-b-[32px] bg-plum-800 px-6 pt-8 pb-10">
          <h1 className="relative text-[26px] font-bold leading-tight tracking-tight text-white">
            Link invalid
          </h1>
          <p className="relative mt-2 max-w-[18rem] text-[12.5px] font-medium leading-snug text-white/70">
            This reset link is malformed or incomplete. Please request a new one
            from the login page.
          </p>
        </div>
        <div className="px-6 pt-8 pb-10">
          <Button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="w-full"
            size="lg"
          >
            Request a new link
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white">
        <div className="relative overflow-hidden rounded-b-[32px] bg-plum-800 px-6 pt-8 pb-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-plum-700/60 blur-3xl" />
          <h1 className="relative text-[26px] font-bold leading-tight tracking-tight text-white">
            Password reset
          </h1>
          <p className="relative mt-2 max-w-[18rem] text-[12.5px] font-medium leading-snug text-white/70">
            You can now log in with your new password.
          </p>
        </div>
        <div className="px-6 pt-8 pb-10">
          <Button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full"
            size="lg"
          >
            Go to login
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

        <h1 className="relative text-[26px] font-bold leading-tight tracking-tight text-white">
          {isForcedReset ? 'Set your password' : 'Set a new password'}
        </h1>
        <p className="relative mt-2 max-w-[18rem] text-[12.5px] font-medium leading-snug text-white/70">
          {isForcedReset
            ? 'Choose a password to finish setting up your account.'
            : 'Choose a strong password to secure your account.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="px-6 pt-8 pb-10">
        <div className="space-y-4">
          {/* Email field is hidden in the forced-reset flow because
              the borrower's email is not needed to complete the
              password change. */}
          {!isForcedReset && (
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                Email
              </span>
              <Input
                className="mt-1.5"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setError(null);
                  setEmail(e.target.value);
                }}
              />
            </label>
          )}

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              New password
            </span>
            <div className="relative mt-1.5">
              <Input
                className={`pr-12 ${
                  passwordTooShort
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                    : ''
                }`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => {
                  setError(null);
                  setNewPassword(e.target.value);
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
            {passwordTooShort && (
              <p className="mt-1 text-[11px] font-medium text-red-600">
                Password must be at least 8 characters
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Confirm password
            </span>
            <div className="relative mt-1.5">
              <Input
                className={`pr-12 ${
                  passwordsDiffer
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30'
                    : ''
                }`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setError(null);
                  setConfirmPassword(e.target.value);
                }}
              />
              <div className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-ink-400">
                <Lock size={15} strokeWidth={2.2} />
              </div>
            </div>
            {passwordsDiffer && (
              <p className="mt-1 text-[11px] font-medium text-red-600">
                Passwords don&apos;t match
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
              disabled={!readyToSubmit}
              className="w-full"
              size="lg"
            >
              {busy ? 'Saving…' : 'Save password'}
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-[10.5px] font-medium leading-snug text-ink-400">
          Remember your password?{' '}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}