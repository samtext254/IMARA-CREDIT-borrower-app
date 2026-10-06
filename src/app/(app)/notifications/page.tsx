'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type NotificationKind =
  | 'loan_submitted'
  | 'loan_approved'
  | 'loan_rejected'
  | 'loan_disbursed'
  | 'repayment_received'
  | 'due_reminder'
  | 'overdue_alert'
  | 'loan_paid'
  | 'system';

interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    kind: 'due_reminder',
    title: 'Payment due in 3 days',
    body: 'Your next payment of KES 2,500 is due on 15 Oct 2026.',
    at: '2026-10-04T08:00:00Z',
    read: false,
    href: '/loans/l1',
  },
  {
    id: 'n2',
    kind: 'loan_disbursed',
    title: 'Loan disbursed',
    body: 'KES 5,000 has been sent to your M-Pesa number.',
    at: '2026-10-02T14:32:00Z',
    read: false,
    href: '/loans/l2',
  },
  {
    id: 'n3',
    kind: 'loan_submitted',
    title: 'Application received',
    body: 'We received your application for KES 5,000. We will review it shortly.',
    at: '2026-10-02T09:15:00Z',
    read: true,
    href: '/loans/l2',
  },
  {
    id: 'n4',
    kind: 'overdue_alert',
    title: 'Payment overdue',
    body: 'Your loan IL-2026-000139 is 4 days overdue. Please repay to avoid penalties.',
    at: '2026-10-02T07:00:00Z',
    read: true,
    href: '/loans/l3',
  },
  {
    id: 'n5',
    kind: 'repayment_received',
    title: 'Repayment received',
    body: 'We received KES 2,500. Thank you. New outstanding balance: KES 8,500.',
    at: '2026-10-01T17:20:00Z',
    read: true,
    href: '/loans/l1',
  },
  {
    id: 'n6',
    kind: 'loan_rejected',
    title: 'Application not approved',
    body: 'Your application IL-2026-000118 was not approved. Reason: Insufficient credit history.',
    at: '2026-09-19T11:00:00Z',
    read: true,
    href: '/loans/l5',
  },
  {
    id: 'n7',
    kind: 'loan_paid',
    title: 'Loan fully repaid',
    body: 'Congratulations! Loan IL-2026-000121 has been paid in full.',
    at: '2026-09-20T10:45:00Z',
    read: true,
    href: '/loans/l4',
  },
  {
    id: 'n8',
    kind: 'system',
    title: 'Welcome to IMARA CREDIT',
    body: 'Your account is ready. Complete your profile to unlock borrowing.',
    at: '2026-09-15T06:00:00Z',
    read: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Display config                                                     */
/* ------------------------------------------------------------------ */
interface KindStyle {
  icon: ReactNode;
  bg: string;
  fg: string;
}

const KIND_STYLES: Record<NotificationKind, KindStyle> = {
  loan_submitted:      { icon: <FileText size={16} strokeWidth={2.2} />,     bg: 'bg-plum-50',   fg: 'text-plum-700' },
  loan_approved:       { icon: <CheckCircle2 size={16} strokeWidth={2.2} />, bg: 'bg-leaf-50',   fg: 'text-leaf-600' },
  loan_rejected:       { icon: <XCircle size={16} strokeWidth={2.2} />,      bg: 'bg-ink-100',   fg: 'text-ink-500' },
  loan_disbursed:      { icon: <ArrowDownLeft size={16} strokeWidth={2.2} />, bg: 'bg-plum-50',  fg: 'text-plum-700' },
  repayment_received:  { icon: <ArrowUpRight size={16} strokeWidth={2.2} />,  bg: 'bg-leaf-50',  fg: 'text-leaf-600' },
  due_reminder:        { icon: <Clock size={16} strokeWidth={2.2} />,         bg: 'bg-amber-50', fg: 'text-amber-600' },
  overdue_alert:       { icon: <AlertCircle size={16} strokeWidth={2.2} />,   bg: 'bg-orange-50', fg: 'text-orange-600' },
  loan_paid:           { icon: <CheckCircle2 size={16} strokeWidth={2.2} />,  bg: 'bg-leaf-50',  fg: 'text-leaf-600' },
  system:              { icon: <Info size={16} strokeWidth={2.2} />,          bg: 'bg-ink-100',  fg: 'text-ink-500' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const now = Date.now();
  const diffMs = now - then;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}

function dayBucket(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfToday - startOfThatDay) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = items.filter((n) => !n.read).length;

  const groups: { label: string; items: Notification[] }[] = [];
  for (const n of items) {
    const label = dayBucket(n.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function onTap(n: Notification) {
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
    );
    if (n.href) router.push(n.href);
  }

  return (
    <div className="min-h-screen bg-page pb-24">

      {/* ============ NAV — plum purple ============ */}
      <div className="sticky top-0 z-30 bg-plum-800">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
              Inbox
            </p>
            <h1 className="mt-0.5 text-[17px] font-semibold tracking-tight text-white">
              Notifications
            </h1>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="rounded-full bg-white/10 px-3 py-1.5 text-[11.5px] font-semibold text-white ring-1 ring-white/20 transition active:scale-95"
            >
              Mark all read
            </button>
          )}
        </div>
        {/* Yellow accent line */}
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* ============ EMPTY STATE ============ */}
      {items.length === 0 && (
        <div className="px-6 pt-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-plum-50 text-plum-700">
            <Bell size={26} strokeWidth={2.2} />
          </div>
          <h2 className="mt-5 text-[16px] font-bold tracking-tight text-ink-950">
            You&apos;re all caught up
          </h2>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[12.5px] leading-snug text-ink-500">
            Loan updates and reminders will appear here.
          </p>
        </div>
      )}

      {/* ============ GROUPED FEED ============ */}
      {groups.map((group) => (
        <section key={group.label} className="mt-3 bg-white">
          <div className="border-b border-ink-100 px-5 py-2.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              {group.label}
            </h2>
          </div>

          {group.items.map((n, i) => {
            const style = KIND_STYLES[n.kind];
            const isLast = i === group.items.length - 1;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onTap(n)}
                className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition active:bg-ink-100/40 ${
                  !isLast ? 'border-b border-ink-100' : ''
                } ${!n.read ? 'bg-plum-50/40' : 'bg-white'}`}
              >
                {/* Icon */}
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.bg} ${style.fg}`}
                >
                  {style.icon}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-[13.5px] tracking-tight ${
                        !n.read
                          ? 'font-bold text-ink-950'
                          : 'font-semibold text-ink-800'
                      }`}
                    >
                      {n.title}
                    </p>
                    <span className="shrink-0 pt-0.5 text-[10.5px] font-medium text-ink-400">
                      {relativeTime(n.at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">
                    {n.body}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-plum-700" />
                )}
              </button>
            );
          })}
        </section>
      ))}

      {/* ============ FOOTER ============ */}
      {items.length > 0 && (
        <div className="px-8 pb-8 pt-6 text-center">
          <p className="text-[10px] font-medium tracking-wide text-ink-400/80">
            You&apos;re all caught up · Notifications are kept for 90 days
          </p>
        </div>
      )}
    </div>
  );
}