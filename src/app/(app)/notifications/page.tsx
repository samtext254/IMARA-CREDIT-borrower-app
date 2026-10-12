'use client';

import { useEffect, useState } from 'react';
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
import { loans as loansApi } from '@/lib/loans';
import type { ActivityItem, ActivityKind } from '@/lib/loans';

type NotificationKind = ActivityKind;

interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

const SEEN_KEY_PREFIX = 'imara.notifications.seen';

function loadSeenAt(): number {
  try {
    const raw = localStorage.getItem(SEEN_KEY_PREFIX);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveSeenAt(ts: number) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX, String(ts));
  } catch { /* ignore */ }
}

interface KindStyle { icon: ReactNode; bg: string; fg: string; }

const KIND_STYLES: Record<NotificationKind, KindStyle> = {
  loan_submitted:     { icon: <FileText size={16} strokeWidth={2.2} />,     bg: 'bg-plum-50',    fg: 'text-plum-700' },
  loan_approved:      { icon: <CheckCircle2 size={16} strokeWidth={2.2} />, bg: 'bg-leaf-50',    fg: 'text-leaf-600' },
  loan_rejected:      { icon: <XCircle size={16} strokeWidth={2.2} />,      bg: 'bg-ink-100',    fg: 'text-ink-500' },
  loan_disbursed:     { icon: <ArrowDownLeft size={16} strokeWidth={2.2} />,bg: 'bg-plum-50',    fg: 'text-plum-700' },
  loan_active:        { icon: <CheckCircle2 size={16} strokeWidth={2.2} />, bg: 'bg-leaf-50',    fg: 'text-leaf-600' },
  loan_overdue:       { icon: <AlertCircle size={16} strokeWidth={2.2} />,  bg: 'bg-orange-50',  fg: 'text-orange-600' },
  loan_paid:          { icon: <CheckCircle2 size={16} strokeWidth={2.2} />, bg: 'bg-leaf-50',    fg: 'text-leaf-600' },
  loan_defaulted:     { icon: <XCircle size={16} strokeWidth={2.2} />,      bg: 'bg-red-50',     fg: 'text-red-600' },
  loan_written_off:   { icon: <XCircle size={16} strokeWidth={2.2} />,      bg: 'bg-red-50',     fg: 'text-red-600' },
  loan_event:         { icon: <Info size={16} strokeWidth={2.2} />,         bg: 'bg-ink-100',    fg: 'text-ink-500' },
  repayment_received: { icon: <ArrowUpRight size={16} strokeWidth={2.2} />, bg: 'bg-leaf-50',    fg: 'text-leaf-600' },
};

function formatKes(n: number | null | undefined): string {
  if (n == null) return '0';
  return Math.round(n).toLocaleString('en-KE');
}

function buildNotification(item: ActivityItem): Notification {
  const id = `${item.kind}-${item.loan_id}-${item.at}`;
  const ref = item.loan_reference || 'your loan';
  const amount = item.amount != null ? `KES ${formatKes(item.amount)}` : null;

  switch (item.kind) {
    case 'loan_submitted':
      return { id, kind: item.kind, title: 'Application received',
        body: `We received your application${amount ? ` for ${amount}` : ''}. We will review it shortly.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    case 'loan_approved':
      return { id, kind: item.kind, title: 'Loan approved',
        body: `Your loan ${ref} has been approved.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    case 'loan_rejected':
      return { id, kind: item.kind, title: 'Application not approved',
        body: `Your application ${ref} was not approved.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    case 'loan_disbursed':
      return { id, kind: item.kind, title: 'Loan disbursed',
        body: `${amount ?? 'Your loan'} has been sent to your M-Pesa number.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    case 'loan_active':
      return { id, kind: item.kind, title: 'Loan active',
        body: `${ref} is now active.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    case 'loan_overdue':
      return { id, kind: item.kind, title: 'Payment overdue',
        body: `Your loan ${ref} is overdue. Please repay to avoid further penalties.`,
        at: item.at, read: false, href: `/repay/${item.loan_id}` };
    case 'loan_paid':
      return { id, kind: item.kind, title: 'Loan fully repaid',
        body: `Congratulations! Loan ${ref} has been paid in full.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    case 'loan_defaulted':
    case 'loan_written_off':
      return { id, kind: item.kind, title: 'Loan closed',
        body: `Loan ${ref} has been ${item.kind === 'loan_defaulted' ? 'defaulted' : 'written off'}. Contact support.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    case 'repayment_received':
      return { id, kind: item.kind, title: 'Repayment received',
        body: `We received ${amount ?? 'your repayment'}${item.receipt ? ` — receipt ${item.receipt}` : ''}. Thank you.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
    default:
      return { id, kind: item.kind, title: 'Loan update',
        body: `Update on ${ref}.`,
        at: item.at, read: false, href: `/loans/${item.loan_id}` };
  }
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Intl.DateTimeFormat('en-KE', { day: '2-digit', month: 'short' })
    .format(new Date(iso));
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
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(d);
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await loansApi.getActivity({ limit: 50 });
        if (cancelled) return;
        const seenAt = loadSeenAt();
        const list = (res.data || []).map((it) => {
          const n = buildNotification(it);
          const t = new Date(it.at).getTime();
          return { ...n, read: Number.isFinite(t) && t <= seenAt };
        });
        setItems(list);
      } catch (err) {
        if (cancelled) return;
        setError('Could not load notifications.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    saveSeenAt(Date.now());
  }

  function onTap(n: Notification) {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.href) router.push(n.href);
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="sticky top-0 z-30 bg-plum-800">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">Inbox</p>
            <h1 className="mt-0.5 text-[17px] font-semibold tracking-tight text-white">Notifications</h1>
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
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {loading && (
        <div className="space-y-3 px-3 pt-3">
          <div className="h-16 animate-pulse rounded-xl bg-ink-100/40" />
          <div className="h-16 animate-pulse rounded-xl bg-ink-100/40" />
          <div className="h-16 animate-pulse rounded-xl bg-ink-100/40" />
        </div>
      )}

      {!loading && error && (
        <div className="px-6 pt-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle size={26} strokeWidth={2.2} />
          </div>
          <h2 className="mt-5 text-[16px] font-bold tracking-tight text-ink-950">Couldn't load</h2>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[12.5px] leading-snug text-ink-500">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="px-6 pt-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-plum-50 text-plum-700">
            <Bell size={26} strokeWidth={2.2} />
          </div>
          <h2 className="mt-5 text-[16px] font-bold tracking-tight text-ink-950">You&apos;re all caught up</h2>
          <p className="mx-auto mt-1.5 max-w-[16rem] text-[12.5px] leading-snug text-ink-500">
            Loan updates and reminders will appear here.
          </p>
        </div>
      )}

      {!loading && !error && groups.map((group) => (
        <section key={group.label} className="mt-3 bg-white">
          <div className="border-b border-ink-100 px-5 py-2.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{group.label}</h2>
          </div>
          {group.items.map((n, i) => {
            const style = KIND_STYLES[n.kind] || KIND_STYLES.loan_event;
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
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.bg} ${style.fg}`}>
                  {style.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[13.5px] tracking-tight ${!n.read ? 'font-bold text-ink-950' : 'font-semibold text-ink-800'}`}>
                      {n.title}
                    </p>
                    <span className="shrink-0 pt-0.5 text-[10.5px] font-medium text-ink-400">
                      {relativeTime(n.at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{n.body}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-plum-700" />}
              </button>
            );
          })}
        </section>
      ))}

      {!loading && !error && items.length > 0 && (
        <div className="px-8 pb-8 pt-6 text-center">
          <p className="text-[10px] font-medium tracking-wide text-ink-400/80">
            You&apos;re all caught up · Notifications are kept for 90 days
          </p>
        </div>
      )}
    </div>
  );
}