'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInvalid = submitted && !email.trim();
  const passwordInvalid = submitted && password.length < 6;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError(null);

    if (!email.trim() || password.length < 6) return;

    setBusy(true);
    try {
      // TODO: POST /api/auth/login when wired.
      await new Promise((r) => setTimeout(r, 900));

      // Hand off to the email OTP step
      router.push(`/verify?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ============ HERO HEADER — plum + yellow accent ============ */}
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
                placeholder="At least 6 characters"
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
                Password must be at least 6 characters
              </p>
            )}
          </label>

          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => router.push('/forgot-password')}
              className="text-[12px] font-semibold text-plum-700 transition active:opacity-70"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11.5px] font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={busy}
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