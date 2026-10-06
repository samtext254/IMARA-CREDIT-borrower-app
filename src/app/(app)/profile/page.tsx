'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Lock,
  Shield,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Local UI helpers                                                   */
/* ------------------------------------------------------------------ */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-ink-100 bg-white px-5 py-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        {title}
      </h2>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 border-b border-ink-100 bg-white px-5 py-3.5 text-left transition active:bg-ink-100/40 last:border-b-0"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-50 text-plum-700">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold tracking-tight text-ink-950">
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-[11px] font-medium text-ink-400">{hint}</p>
        )}
      </div>

      <ChevronRight size={16} className="shrink-0 text-ink-400" strokeWidth={2.2} />
    </button>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
      </p>
      <p className="mt-1.5 text-[16px] font-bold tracking-tight text-ink-950 tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[10.5px] font-medium text-ink-400">{sub}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ProfilePage() {
  const router = useRouter();

  // Mock user — swap for GET /api/lending/me later
  const [user] = useState({
    name: 'Sam',
    initials: 'S',
    phone: '+254 712 345 678',
    memberSince: 'Aug 2026',
    kycComplete: true,
    nationalIdMasked: '•••••• 78',
    email: 'sam@example.com',
    borrowingLimit: 25000,
    activeLoans: 1,
  });

  return (
    <div className="min-h-screen bg-page pb-24">

      {/* ============ NAV — plum purple ============ */}
      <div className="sticky top-0 z-30 bg-plum-800">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="relative shrink-0">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/20">
              {user.initials}
            </div>
            {user.kycComplete && (
              <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-plum-800 bg-brand-500 text-plum-800">
                <svg viewBox="0 0 10 10" className="h-2 w-2">
                  <path
                    d="M1.5 5l2 2 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold tracking-tight text-white">
              {user.name}
            </h1>
            <p className="mt-0.5 truncate text-[11px] font-medium text-white/60">
              {user.phone}
            </p>
          </div>
        </div>
        {/* Yellow accent line */}
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ KYC CARD — yellow with purple text ============ */}
      <div className="px-3 pt-3">
        {user.kycComplete ? (
          <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 py-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-plum-800/10 text-plum-800">
                <ShieldCheck size={20} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                  KYC status
                </p>
                <p className="mt-1 text-[15px] font-bold tracking-tight text-plum-800">
                  Profile verified
                </p>
                <p className="mt-0.5 text-[11px] text-plum-800/70">
                  Member since {user.memberSince}
                </p>
              </div>
            </div>

            <div className="my-4 h-px bg-plum-800/10" />

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-plum-800/60">National ID</span>
                <span className="font-semibold tabular-nums">
                  {user.nationalIdMasked}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="shrink-0 text-plum-800/60">Email</span>
                <span className="truncate font-semibold">{user.email}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                <Shield size={20} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700/70">
                  KYC status
                </p>
                <p className="mt-1 text-[15px] font-bold tracking-tight text-amber-900">
                  Profile incomplete
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-amber-700/90">
                  Complete your profile to unlock borrowing.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/apply')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13px] font-bold tracking-tight text-white transition active:scale-[0.985]"
            >
              Complete your profile
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* ============ ACCOUNT SUMMARY ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Account" />

        <div className="grid grid-cols-2 divide-x divide-ink-100">
          <StatTile
            label="Limit"
            value={`KES ${(user.borrowingLimit / 1000).toFixed(0)}K`}
          />
          <StatTile
            label="Active"
            value={String(user.activeLoans)}
            sub={user.activeLoans === 1 ? 'loan' : 'loans'}
          />
        </div>
      </section>

      {/* ============ SETTINGS ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Settings" />

        <SettingsRow
          icon={<Bell size={17} strokeWidth={2.2} />}
          label="Notifications"
          hint="Push and SMS preferences"
        />
        <SettingsRow
          icon={<Lock size={17} strokeWidth={2.2} />}
          label="Security & PIN"
          hint="Manage your login PIN"
        />
        <SettingsRow
          icon={<WalletCards size={17} strokeWidth={2.2} />}
          label="Disbursement account"
          hint={user.phone}
        />
      </section>

      {/* ============ SUPPORT ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Support" />

        <SettingsRow
          icon={<HelpCircle size={17} strokeWidth={2.2} />}
          label="Help centre"
        />
        <SettingsRow
          icon={<FileText size={17} strokeWidth={2.2} />}
          label="Terms & conditions"
        />
        <SettingsRow
          icon={<Shield size={17} strokeWidth={2.2} />}
          label="Privacy policy"
        />
        <SettingsRow
          icon={<Info size={17} strokeWidth={2.2} />}
          label="About IMARA CREDIT"
          hint="Version 0.1.0"
        />
      </section>

      {/* ============ FOOTER ============ */}
      <div className="px-8 pb-8 pt-6 text-center">
        <p className="text-[10px] font-medium tracking-wide text-ink-400/80">
          IMARA CREDIT · v0.1.0
        </p>
      </div>
    </div>
  );
}