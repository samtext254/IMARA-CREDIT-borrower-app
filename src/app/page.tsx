'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DownloadAppButton } from '@/components/pwa/DownloadAppButton';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-plum-800">

      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-plum-700/60 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-72 w-72 rounded-full bg-plum-900/50 blur-3xl" />

      {/* ============ TOP: brand + tagline ============ */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">

        {/* Brand mark — yellow rounded square with a purple "I" */}
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-500 text-plum-800 shadow-[0_18px_40px_-12px_rgba(255,206,7,0.5)]">
          <span className="text-[40px] font-black leading-none tracking-tighter">
            I
          </span>
        </div>

        {/* Wordmark */}
        <h1 className="mt-7 text-[26px] font-black tracking-[0.18em] text-white">
          IMARA
        </h1>
        <p className="mt-1 text-[13px] font-bold tracking-[0.42em] text-brand-500">
          CREDIT
        </p>

        {/* Tagline */}
        <p className="mt-8 max-w-[15rem] text-[14px] font-medium leading-snug text-white/70">
          Your finance, in perfect harmony.
        </p>
      </div>

      {/* ============ BOTTOM: CTAs ============ */}
      <div className="relative space-y-3 px-6 pb-10">

        {/* Primary — yellow with purple text */}
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-4 text-[15px] font-bold tracking-tight text-plum-800 shadow-[0_10px_28px_-10px_rgba(255,206,7,0.6)] transition active:scale-[0.985]"
        >
          Get started
          <ArrowRight size={17} strokeWidth={2.5} />
        </Link>

        {/* Secondary — translucent white */}
        <Link
          href="/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-4 text-[15px] font-bold tracking-tight text-white ring-1 ring-white/15 transition active:scale-[0.985]"
        >
          I already have an account
        </Link>

        {/* Download app — inline variant, only shows when installable */}
        <DownloadAppButton variant="primary" className="w-full" />

        {/* Legal */}
        <p className="pt-3 text-center text-[10.5px] leading-snug text-white/40">
          By continuing you agree to the IMARA CREDIT Terms
          &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}