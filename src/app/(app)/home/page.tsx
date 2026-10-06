'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  HelpCircle,
  History,
  LogOut,
  Plus,
  Receipt,
  Settings,
  User,
  WalletCards,
} from 'lucide-react';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Circular progress ring — purple stroke on faint track              */
/* ------------------------------------------------------------------ */
function ProgressRing({
  value,
  size = 56,
  stroke = 6,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(91,46,140,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#5b2e8c"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[13px] font-bold leading-none tracking-tight text-plum-800">
          {value}%
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */
function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick?: () => void };
}) {
  return (
    <div className="flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        {title}
      </h2>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[12px] font-semibold tracking-tight text-plum-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar dropdown                                                    */
/* ------------------------------------------------------------------ */
function AvatarMenu({
  initials,
  name,
  email,
  onLogout,
}: {
  initials: string;
  name: string;
  email: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/20 transition active:scale-95"
      >
        {initials}
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-plum-800 bg-brand-500" />
      </button>

      {open && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-60 origin-top-left overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_18px_40px_-20px_rgba(15,21,18,0.35)]"
          >
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="truncate text-[13px] font-bold tracking-tight text-ink-950">
                {name}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-ink-400">
                {email}
              </p>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => go('/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40"
            >
              <User size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">
                My profile
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => go('/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40"
            >
              <Settings size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">
                Settings
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => go('/profile')}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-ink-100/40"
            >
              <HelpCircle size={16} strokeWidth={2.2} className="shrink-0 text-ink-500" />
              <span className="text-[12.5px] font-semibold text-ink-800">
                Help & support
              </span>
            </button>

            <div className="border-t border-ink-100" />

            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:bg-red-50"
            >
              <LogOut size={16} strokeWidth={2.2} className="shrink-0 text-red-600" />
              <span className="text-[12.5px] font-bold text-red-600">
                Log out
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home page                                                          */
/* ------------------------------------------------------------------ */
export default function HomePage() {
  const router = useRouter();

  const user = {
    name: 'Sam',
    initials: 'S',
    email: 'sam@example.com',
    borrowingLimit: 25000,
  };

  const loan = {
    id: 'l1',
    active: true,
    principal: 20000,
    outstanding: 8500,
    paid: 11500,
    progress: 70,
    nextPayment: 2500,
    dueDate: '15 Oct 2026',
  };

  const activities = [
    { title: 'Loan repayment', date: '01 Oct 2026', amount: '- KES 2,500', kind: 'debit' as const },
    { title: 'Loan approved',  date: '20 Sep 2026', amount: '+ KES 20,000', kind: 'credit' as const },
  ];

  function onLogout() {
    try {
      window.sessionStorage.removeItem('imara.apply.draft.v1');
    } catch {
      /* ignore */
    }
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-page pb-24">

      {/* ============ NAV — plum purple with yellow accent ============ */}
      <div className="sticky top-0 z-30 bg-plum-700">
        <div className="flex items-center gap-3 px-5 py-4">
          <AvatarMenu
            initials={user.initials}
            name={user.name}
            email={user.email}
            onLogout={onLogout}
          />

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              Welcome back
            </p>
            <h1 className="mt-0.5 truncate text-[16px] font-semibold tracking-tight text-white">
              {user.name}
            </h1>
          </div>

          <Link
            href="/notifications"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={18} strokeWidth={2.2} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-plum-700" />
          </Link>
        </div>
        {/* Yellow accent line */}
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ HERO — yellow card with purple text ============ */}
      {loan.active ? (
        <div className="px-3 pt-3">
          <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 pt-5 pb-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                  Outstanding balance
                </p>
                <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
                  KES {loan.outstanding.toLocaleString()}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-plum-800/60">
                  of KES {loan.principal.toLocaleString()} principal
                </p>
              </div>

              <ProgressRing value={loan.progress} />
            </div>

            <div className="my-4 h-px bg-plum-800/10" />

            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-800/10 text-plum-800">
                <Clock3 size={16} strokeWidth={2.2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-plum-800/60">
                  Next payment
                </p>
                <p className="mt-0.5 truncate text-[14px] font-bold tracking-tight text-plum-800 tabular-nums">
                  KES {loan.nextPayment.toLocaleString()}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-plum-800/60">
                  Due
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[12px] font-semibold text-plum-800/90">
                  {loan.dueDate}
                </p>
              </div>
            </div>

            {/* CTA — purple on yellow */}
            <Link
              href={`/repay/${loan.id}`}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
            >
              Repay now
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="px-3 pt-3">
          <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 pt-5 pb-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                  Available to borrow
                </p>
                <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
                  KES {user.borrowingLimit.toLocaleString()}
                </p>
              </div>

              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-plum-800/10 text-plum-800">
                <WalletCards size={19} strokeWidth={2.2} />
              </div>
            </div>

            <div className="my-4 h-px bg-plum-800/10" />

            <div className="flex items-center gap-2 text-[12px] font-medium text-plum-800/70">
              <CheckCircle2 size={15} strokeWidth={2.2} />
              <span>Your profile is complete</span>
            </div>

            <Link
              href="/apply/loan"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]"
            >
              Apply for a loan
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}

      {/* ============ VIEW FULL LOAN row ============ */}
      {loan.active && (
        <Link
          href="/loans"
          className="mt-3 flex w-full items-center justify-between gap-3 border-b border-ink-100 bg-white px-5 py-4 text-left transition active:bg-ink-100/40"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              View full loan
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold tracking-tight text-ink-950">
              Schedule & repayments
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-ink-400" strokeWidth={2.2} />
        </Link>
      )}

      {/* ============ QUICK ACTIONS ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader title="Quick actions" />

        <div className="grid grid-cols-4 gap-3 px-4 py-5">
          <QuickAction href="/apply/loan" icon={<Plus size={19} />}       label="Apply"     />
          <QuickAction href="/loans"      icon={<CreditCard size={19} />} label="Statement" />
          <QuickAction href="/loans"      icon={<History size={19} />}    label="History"   />
          <QuickAction href="/profile"    icon={<HelpCircle size={19} />} label="Help"      />
        </div>
      </section>

      {/* ============ RECENT ACTIVITY ============ */}
      <section className="mt-3 bg-white">
        <SectionHeader
          title="Recent activity"
          action={{ label: 'View all' }}
        />

        {activities.map((activity, index) => (
          <div
            key={activity.title}
            className={`flex items-center gap-3.5 px-5 py-3.5 ${
              index !== activities.length - 1 ? 'border-b border-ink-100' : ''
            }`}
          >
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                activity.kind === 'credit'
                  ? 'bg-leaf-50 text-leaf-600'
                  : 'bg-plum-50 text-plum-700'
              }`}
            >
              {activity.kind === 'credit'
                ? <CheckCircle2 size={18} strokeWidth={2.2} />
                : <Receipt size={18} strokeWidth={2.2} />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold tracking-tight text-ink-950">
                {activity.title}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-ink-400">
                {activity.date}
              </p>
            </div>

            <p
              className={`shrink-0 text-[13.5px] font-bold tabular-nums tracking-tight ${
                activity.kind === 'credit' ? 'text-leaf-600' : 'text-ink-900'
              }`}
            >
              {activity.amount}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick action tile — purple tile with white icon                    */
/* ------------------------------------------------------------------ */
function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 transition active:scale-95"
    >
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-plum-700 text-white">
        {icon}
      </div>
      <span className="text-[11px] font-semibold tracking-tight text-ink-700">
        {label}
      </span>
    </Link>
  );
}