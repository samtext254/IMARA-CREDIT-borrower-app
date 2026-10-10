'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Smartphone,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  HelpCircle,
  ChevronRight,
  Loader2,
  Download,
  Share2,
  Check,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImaraApiError } from '@/lib/api';
import { loans as loansApi, loanDueDate } from '@/lib/loans';
import type { Loan, LoanScheduleEntry } from '@/lib/loans';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function normalizeKenyanPhone(input: string | null | undefined): string | null {
  const cleaned = String(input || '').replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) return `254${cleaned.slice(1)}`;
  if (cleaned.startsWith('7') && cleaned.length === 9) return `254${cleaned}`;
  if (cleaned.startsWith('1') && cleaned.length === 9) return `254${cleaned}`;
  if (cleaned.startsWith('254') && cleaned.length === 12) return cleaned;
  return null;
}

function formatKes(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
  return Math.round(n).toLocaleString('en-KE');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ------------------------------------------------------------------ */
/*  Small UI bits                                                      */
/* ------------------------------------------------------------------ */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white">
      <div className="border-b border-ink-100 px-4 py-3">
        <h2 className="text-[13px] font-bold tracking-tight text-ink-950">{title}</h2>
      </div>
      <div className="space-y-3 px-4 py-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
      {children}
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[11px] font-medium text-red-600">{children}</p>;
}

/* ------------------------------------------------------------------ */
/*  Paybill sheet — reads the loan's repayment_account_number          */
/* ------------------------------------------------------------------ */
const PAYBILL_NUMBER = '4049263';

function PaybillSheet({
  open,
  onClose,
  accountNumber,
}: {
  open: boolean;
  onClose: () => void;
  accountNumber: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-[28rem] rounded-t-3xl bg-white shadow-2xl">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-ink-200" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              Alternative payment
            </p>
            <h2 className="mt-0.5 text-[17px] font-bold tracking-tight text-ink-950">
              Pay with Paybill
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100/70 text-ink-700 transition active:scale-95"
            aria-label="Close"
          >
            <X size={17} strokeWidth={2.4} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 pb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            How to pay
          </p>
          <ol className="mt-3 space-y-3">
            {[
              'Open M-Pesa on your phone',
              'Select Lipa na M-Pesa → Pay Bill',
              `Enter Business Number: ${PAYBILL_NUMBER}`,
              `Enter Account Number: ${accountNumber}`,
              'Enter amount and your M-Pesa PIN',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-plum-50 text-[11px] font-bold text-plum-700">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-[12.5px] leading-snug text-ink-700">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-center text-[10.5px] leading-snug text-ink-400">
            Your repayment will be applied automatically within a minute of the M-Pesa confirmation SMS.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
type FlowState = 'idle' | 'processing' | 'pending' | 'success' | 'error';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 40; // ~100s

export default function RepayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const loanId = params?.id ?? '';

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<LoanScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showPaybill, setShowPaybill] = useState(false);

  const [flow, setFlow] = useState<FlowState>('idle');
  const [intentId, setIntentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    amount: number;
    receipt: string | null;
    newOutstanding: number | null;
  } | null>(null);

  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch the loan ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!loanId) {
        setLoadError('Missing loan ID.');
        setLoading(false);
        return;
      }
      try {
        const res = await loansApi.getLoan(loanId);
        if (cancelled) return;
        setLoan(res.data.loan);
        setSchedule(res.data.schedule || []);
        const outstanding = parseFloat(res.data.loan.outstanding_total || '0');
        if (outstanding > 0) setAmountInput(String(Math.round(outstanding)));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ImaraApiError) {
          setLoadError(err.code === 'NOT_FOUND' ? 'This loan could not be found.' : err.message);
        } else {
          setLoadError('Could not load loan details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loanId]);

  // ─── Cleanup on unmount ────────────────────────────────────
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (redirectRef.current) clearTimeout(redirectRef.current);
    },
    []
  );

  const outstanding = useMemo(() => (loan ? parseFloat(loan.outstanding_total || '0') : 0), [loan]);
  const normalizedPhone = useMemo(() => normalizeKenyanPhone(phone), [phone]);
  const amount = useMemo(() => {
    const n = Number(amountInput.replace(/\D/g, '')) || 0;
    return Math.min(n, outstanding);
  }, [amountInput, outstanding]);

  const phoneError = submitted && !normalizedPhone;
  const amountError = submitted && (amount <= 0 || amount > outstanding);

  // ─── Poller ────────────────────────────────────────────────
  function startPolling(id: string) {
    setPollCount(0);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      setPollCount((prev) => {
        if (prev + 1 >= POLL_MAX_ATTEMPTS && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setFlow('error');
          setErrorMsg('Payment is taking longer than expected. Check your M-Pesa messages.');
        }
        return prev + 1;
      });

      try {
        const res = await loansApi.getRepaymentStatus(loanId, id);
        const d = res.data;
        if (d.status === 'SUCCESS') {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setSuccessData({
            amount: d.amount,
            receipt: d.mpesa_receipt,
            newOutstanding: d.new_outstanding_total ? parseFloat(d.new_outstanding_total) : null,
          });
          setFlow('success');
          redirectRef.current = setTimeout(() => router.push(`/loans/${loanId}`), 4000);
        } else if (d.status === 'FAILED') {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setFlow('error');
          setErrorMsg(d.result_desc || 'Payment failed. Please try again.');
        }
      } catch {
        // transient — keep polling until attempt limit
      }
    }, POLL_INTERVAL_MS);
  }

  // ─── Submit ────────────────────────────────────────────────
  async function onRequestStk() {
    setSubmitted(true);
    setErrorMsg(null);
    if (!normalizedPhone) {
      setErrorMsg('Enter a valid M-Pesa number');
      return;
    }
    if (amount <= 0 || amount > outstanding) {
      setErrorMsg('Enter a valid amount');
      return;
    }
    if (!loan) {
      setErrorMsg('Loan not loaded');
      return;
    }

    setFlow('processing');
    try {
      const res = await loansApi.repay(loan.id, {
        amount: Math.round(amount),
        phone_number: normalizedPhone,
      });
      const id = res.data.repayment_id;
      setIntentId(id);
      setFlow('pending');
      startPolling(id);
    } catch (err) {
      setFlow('error');
      if (err instanceof ImaraApiError) {
        setErrorMsg(err.message || 'Could not process the repayment.');
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    }
  }

  function resetToIdle() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (redirectRef.current) {
      clearTimeout(redirectRef.current);
      redirectRef.current = null;
    }
    setFlow('idle');
    setIntentId(null);
    setErrorMsg(null);
    setSuccessData(null);
    setSubmitted(false);
    setPollCount(0);
  }

  // ─── Receipt helpers ───────────────────────────────────────
  function drawReceiptCanvas(): HTMLCanvasElement {
    const scale = 2;
    const width = 480;
    const height = 620;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, 0, width, 6);

    ctx.beginPath();
    ctx.arc(width / 2, 74, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#ECFDF5';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#10B981';
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(width / 2 - 10, 74);
    ctx.lineTo(width / 2 - 2, 83);
    ctx.lineTo(width / 2 + 13, 63);
    ctx.stroke();

    ctx.fillStyle = '#0a2540';
    ctx.font = '600 15px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Payment Successful', width / 2, 126);

    const paid = successData?.amount ?? amount;
    ctx.fillStyle = '#111827';
    ctx.font = '700 30px Arial';
    ctx.fillText(
      `KES ${paid.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      width / 2,
      165
    );

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 195);
    ctx.lineTo(width - 40, 195);
    ctx.stroke();

    const rows: [string, string][] = [
      ['Paid to', loan?.loan_reference ? `Loan ${loan.loan_reference}` : 'Loan'],
      ['Reference', successData?.receipt || intentId || '—'],
      ['Date', new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })],
    ];
    if (successData?.newOutstanding != null) {
      rows.push(['New outstanding', `KES ${successData.newOutstanding.toLocaleString('en-KE')}`]);
    }
    let y = 230;
    rows.forEach(([label, value]) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#6b7280';
      ctx.font = '400 12.5px Arial';
      ctx.fillText(label, 40, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#111827';
      ctx.font = '600 12.5px Arial';
      const v = String(value);
      ctx.fillText(v.length > 30 ? v.slice(0, 30) + '…' : v, width - 40, y);
      y += 36;
    });

    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(40, y + 6);
    ctx.lineTo(width - 40, y + 6);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '400 11px Arial';
    ctx.fillText('Powered by Imara Credit', width / 2, y + 36);

    return canvas;
  }

  function downloadReceipt() {
    const canvas = drawReceiptCanvas();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${successData?.receipt || intentId || 'repayment'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  async function shareReceipt() {
    try {
      const canvas = drawReceiptCanvas();
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
      const text = `Repayment of KES ${(successData?.amount ?? amount).toLocaleString('en-KE')} — ${
        successData?.receipt || intentId || ''
      }`;
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        if (blob) {
          const file = new File([blob], `receipt.png`, { type: 'image/png' });
          if ((navigator as any).canShare?.({ files: [file] })) {
            await (navigator as any).share({ files: [file], title: 'Repayment receipt', text });
            return;
          }
        }
        await (navigator as any).share({ title: 'Repayment receipt', text });
        return;
      }
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
    } catch {
      /* user cancelled */
    }
  }

  /* ─── Loading / load error ─────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-page">
        <div className="sticky top-0 z-30 bg-plum-800">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-1 w-full bg-brand-500" />
        </div>
        <div className="px-3 pt-3">
          <div className="h-56 animate-pulse rounded-2xl bg-ink-100/40" />
        </div>
      </div>
    );
  }

  if (loadError || !loan) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="sticky top-0 z-30 bg-plum-800">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => router.back()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft size={17} strokeWidth={2.2} />
            </button>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">Repayment</h1>
          </div>
          <div className="h-1 w-full bg-brand-500" />
        </div>
        <div className="px-6 pt-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink-100/60 text-ink-400">
            <AlertCircle size={24} strokeWidth={2} />
          </div>
          <p className="mt-4 text-[14px] font-semibold text-ink-800">Not available</p>
          <p className="mt-2 text-[12px] text-ink-500">{loadError || 'Loan not found.'}</p>
        </div>
      </div>
    );
  }

  const repayable =
    loan.status === 'ACTIVE' || loan.status === 'OVERDUE' || loan.status === 'DISBURSED';
  const displayReference = loan.loan_reference;
  const dueDate = loanDueDate(loan);
  const accountNumber = loan.repayment_account_number || '—';

  /* ─── Success card ─────────────────────────────────────── */
  if (flow === 'success' && successData) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <div className="sticky top-0 z-30 bg-plum-800">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button
              onClick={() => {
                if (redirectRef.current) clearTimeout(redirectRef.current);
                router.push(`/loans/${loanId}`);
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
              aria-label="Back"
            >
              <ArrowLeft size={17} strokeWidth={2.2} />
            </button>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">Repayment</h1>
          </div>
          <div className="h-1 w-full bg-brand-500" />
        </div>

        <div className="px-3 pt-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
              <CheckCircle size={28} className="text-emerald-600" strokeWidth={2.4} />
            </div>
            <p className="mt-3 text-[17px] font-bold text-emerald-900">Payment Successful</p>
            <p className="mt-1.5 text-[12.5px] text-emerald-700">
              KES {formatKes(successData.amount)} paid toward {displayReference}
            </p>
            {successData.receipt && (
              <p className="mt-1 text-[11px] font-mono text-emerald-700">
                Receipt: {successData.receipt}
              </p>
            )}
            {successData.newOutstanding != null && (
              <p className="mt-2 text-[12px] text-emerald-800">
                New outstanding:{' '}
                <span className="font-bold">KES {formatKes(successData.newOutstanding)}</span>
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={downloadReceipt}
                className="flex-1 h-10 rounded-lg border border-emerald-300 bg-white text-[13px] font-medium text-emerald-800 hover:bg-emerald-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={shareReceipt}
                className="flex-1 h-10 rounded-lg bg-emerald-700 text-white text-[13px] font-semibold hover:bg-emerald-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
            </div>

            <p className="mt-4 text-[10.5px] text-emerald-700">
              Taking you to your loan details…
            </p>
            <button
              onClick={() => {
                if (redirectRef.current) clearTimeout(redirectRef.current);
                router.push(`/loans/${loanId}`);
              }}
              className="mt-2 text-[12px] font-semibold text-emerald-800 underline underline-offset-2"
            >
              Go now
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main repay UI ────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-page pb-24">
      {/* NAV */}
      <div className="sticky top-0 z-30 bg-plum-800">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60">
              Repayment
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
              Pay {displayReference}
            </h1>
          </div>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {/* SUMMARY */}
      <div className="px-3 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Outstanding balance
          </p>
          <p className="mt-1.5 text-[24px] font-bold leading-none tracking-[-0.02em] text-ink-950 tabular-nums">
            KES {formatKes(loan.outstanding_total)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-ink-400">Due {formatDate(dueDate)}</p>
        </div>
      </div>

      {!repayable && (
        <div className="px-3 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
            This loan cannot be repaid right now (status: {loan.status}).
          </div>
        </div>
      )}

      {repayable && flow !== 'pending' && (
        <div className="pt-3">
          <SectionCard title="Pay with M-Pesa">
            <label className="block">
              <FieldLabel>M-Pesa number</FieldLabel>
              <div className="relative mt-1">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <Input
                  className="pl-9"
                  inputMode="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setPhone(e.target.value);
                  }}
                  disabled={flow === 'processing'}
                />
              </div>
              {phoneError && <FieldError>Enter a valid M-Pesa number</FieldError>}
            </label>

            <label className="block">
              <FieldLabel>Amount</FieldLabel>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-400">
                  KES
                </span>
                <Input
                  className="pl-12"
                  inputMode="numeric"
                  placeholder={String(Math.round(outstanding))}
                  value={amountInput}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setAmountInput(e.target.value.replace(/\D/g, ''));
                  }}
                  disabled={flow === 'processing'}
                />
              </div>
              {amountError && (
                <FieldError>
                  {amount <= 0 ? 'Enter an amount' : `Maximum is KES ${formatKes(outstanding)}`}
                </FieldError>
              )}
            </label>

            {flow === 'error' && errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
                <div className="flex items-start gap-2">
                  <XCircle size={15} className="mt-0.5 shrink-0 text-red-600" strokeWidth={2.4} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-red-800">Payment Failed</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-red-700">{errorMsg}</p>
                  </div>
                </div>
                <button
                  onClick={resetToIdle}
                  className="mt-3 h-9 rounded-lg bg-red-600 px-4 text-[12px] font-semibold text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {flow === 'idle' && errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5">
                <AlertCircle
                  size={14}
                  className="mt-0.5 shrink-0 text-red-600"
                  strokeWidth={2.4}
                />
                <p className="text-[11.5px] font-medium text-red-700">{errorMsg}</p>
              </div>
            )}

            <Button
              type="button"
              onClick={onRequestStk}
              disabled={flow === 'processing'}
              className="w-full"
              size="md"
            >
              {flow === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : (
                'Send M-Pesa request'
              )}
            </Button>
          </SectionCard>
        </div>
      )}

      {repayable && flow === 'pending' && (
        <div className="pt-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white ring-4 ring-amber-200">
              <Smartphone className="h-7 w-7 animate-pulse text-amber-600" />
            </div>
            <p className="mt-4 text-[15px] font-bold text-amber-900">Waiting for confirmation</p>
            <p className="mt-1 text-[11.5px] text-amber-700">
              Check your phone and enter your M-Pesa PIN for KES {formatKes(amount)}.
            </p>
            <p className="mt-2 text-[11px] text-amber-700/80">
              {((pollCount * POLL_INTERVAL_MS) / 1000).toFixed(0)}s elapsed
            </p>

            <div className="mt-5 space-y-2.5 text-left">
              {['Request sent to your phone', 'Enter your PIN', 'Confirming with M-Pesa'].map(
                (label, idx) => {
                  const active = pollCount < 1 ? 0 : pollCount < 3 ? 1 : 2;
                  const done = idx < active;
                  const current = idx === active;
                  return (
                    <div key={label} className="flex items-center gap-2.5">
                      <div
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                          done ? 'bg-emerald-500' : current ? 'bg-amber-500' : 'bg-amber-200'
                        }`}
                      >
                        {done ? (
                          <Check className="h-3 w-3 text-white" />
                        ) : current ? (
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        ) : null}
                      </div>
                      <span
                        className={`text-[12.5px] ${
                          idx <= active ? 'font-medium text-amber-900' : 'text-amber-700/70'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-amber-200 pt-3">
              <WifiOff className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[11px] text-amber-700">Checking status automatically</span>
            </div>

            <button
              onClick={resetToIdle}
              className="mt-4 text-[11.5px] font-medium text-amber-800 underline underline-offset-2"
            >
              I didn&apos;t receive a prompt — start over
            </button>
          </div>
        </div>
      )}

      {/* PAYBILL */}
      {repayable && flow !== 'pending' && (
        <button
          type="button"
          onClick={() => setShowPaybill(true)}
          className="mt-3 flex w-full items-center gap-3.5 border-b border-ink-100 bg-white px-5 py-4 text-left transition active:bg-ink-100/40"
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-plum-50 text-plum-700">
            <HelpCircle size={17} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold tracking-tight text-ink-950">
              Having trouble?
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-400">
              Pay with Paybill instead
            </p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-ink-400" strokeWidth={2.2} />
        </button>
      )}

      <div className="px-8 pb-6 pt-4 text-center">
        <p className="text-[10px] font-medium tracking-wide text-ink-400/80">
          Trouble paying? Contact support from your profile.
        </p>
      </div>

      <PaybillSheet
        open={showPaybill}
        onClose={() => setShowPaybill(false)}
        accountNumber={accountNumber}
      />
    </div>
  );
}