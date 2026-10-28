'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Smartphone, AlertCircle, CheckCircle, XCircle, 
  X, HelpCircle, ChevronRight, Loader2, Download, Share2, Check, WifiOff,
  Home, Shield, Compass, FileText, LogOut, Menu, Clock3, CheckCircle2,
  WalletCards, Receipt, PiggyBank, Briefcase, Leaf, Search, Bell, ChevronDown, User
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
/*  Shared Components                                                  */
/* ------------------------------------------------------------------ */
function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
        <Leaf size={24} className="text-emerald-500" fill="currentColor" />
      </div>
      <div className="leading-tight">
        <p className={`text-[20px] tracking-tight ${dark ? 'text-white' : 'text-[#0f2f66]'}`}>
          <span className="font-extrabold">Imara</span> <span className="font-medium">Credit</span>
        </p>
        <p className={`text-[8px] font-medium ${dark ? 'text-slate-300' : 'text-slate-500'}`}>
          Loans • Payments • Financial Growth
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Paybill sheet                                                      */
/* ------------------------------------------------------------------ */
const PAYBILL_NUMBER = '4049263';

function PaybillSheet({ open, onClose, accountNumber }: { open: boolean; onClose: () => void; accountNumber: string; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-start justify-between gap-3 px-6 pt-4 pb-4 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Alternative payment</p>
            <h2 className="mt-0.5 text-xl font-bold text-slate-900">Pay with Paybill</h2>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 pb-8 pt-5">
          <ol className="space-y-4">
            {[
              'Open M-Pesa on your phone',
              'Select Lipa na M-Pesa → Pay Bill',
              `Enter Business Number: ${PAYBILL_NUMBER}`,
              `Enter Account Number: ${accountNumber}`,
              'Enter amount and your M-Pesa PIN',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#0077C8]">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm leading-6 text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-center text-xs text-slate-400">
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
const POLL_MAX_ATTEMPTS = 40;

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [flow, setFlow] = useState<FlowState>('idle');
  const [intentId, setIntentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ amount: number; receipt: string | null; newOutstanding: number | null; } | null>(null);

  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => { cancelled = true; };
  }, [loanId]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (redirectRef.current) clearTimeout(redirectRef.current);
  }, []);

  const outstanding = useMemo(() => (loan ? parseFloat(loan.outstanding_total || '0') : 0), [loan]);
  const normalizedPhone = useMemo(() => normalizeKenyanPhone(phone), [phone]);
  const amount = useMemo(() => {
    const n = Number(amountInput.replace(/\D/g, '')) || 0;
    return Math.min(n, outstanding);
  }, [amountInput, outstanding]);

  const phoneError = submitted && !normalizedPhone;
  const amountError = submitted && (amount <= 0 || amount > outstanding);

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
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setSuccessData({
            amount: d.amount,
            receipt: d.mpesa_receipt,
            newOutstanding: d.new_outstanding_total ? parseFloat(d.new_outstanding_total) : null,
          });
          setFlow('success');
          redirectRef.current = setTimeout(() => router.push(`/loans/${loanId}`), 4000);
        } else if (d.status === 'FAILED') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setFlow('error');
          setErrorMsg(d.result_desc || 'Payment failed. Please try again.');
        }
      } catch {
        // transient
      }
    }, POLL_INTERVAL_MS);
  }

  async function onRequestStk() {
    setSubmitted(true);
    setErrorMsg(null);
    if (!normalizedPhone) { setErrorMsg('Enter a valid M-Pesa number'); return; }
    if (amount <= 0 || amount > outstanding) { setErrorMsg('Enter a valid amount'); return; }
    if (!loan) { setErrorMsg('Loan not loaded'); return; }

    setFlow('processing');
    try {
      const res = await loansApi.repay(loan.id, { amount: Math.round(amount), phone_number: normalizedPhone });
      const id = res.data.repayment_id;
      setIntentId(id);
      setFlow('pending');
      startPolling(id);
    } catch (err) {
      setFlow('error');
      if (err instanceof ImaraApiError) setErrorMsg(err.message || 'Could not process the repayment.');
      else setErrorMsg('Something went wrong. Please try again.');
    }
  }

  function resetToIdle() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (redirectRef.current) { clearTimeout(redirectRef.current); redirectRef.current = null; }
    setFlow('idle');
    setIntentId(null);
    setErrorMsg(null);
    setSuccessData(null);
    setSubmitted(false);
    setPollCount(0);
  }

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
    ctx.fillText(`KES ${paid.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width / 2, 165);

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
      const text = `Repayment of KES ${(successData?.amount ?? amount).toLocaleString('en-KE')} — ${successData?.receipt || intentId || ''}`;
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
    } catch {}
  }

  /* ─── Loading / Load Error ─────────────────────────────── */
  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex min-h-screen w-full flex-col items-center justify-center bg-[#F4F7FB]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#0a5cbe] border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading repayment details...</p>
      </div>
    );
  }

  if (loadError || !loan) {
    return (
      <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F7FB] font-sans text-slate-800">
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/50">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Not available</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{loadError || 'Loan not found.'}</p>
            <button onClick={() => router.back()} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#0a5cbe] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#084a99]">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const repayable = loan.status === 'ACTIVE' || loan.status === 'OVERDUE' || loan.status === 'DISBURSED';
  const displayReference = loan.loan_reference;
  const dueDate = loanDueDate(loan);
  const accountNumber = loan.repayment_account_number || '—';

  /* ─── SUCCESS STATE ────────────────────────────────────── */
  if (flow === 'success' && successData) {
    return (
      <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F7FB] font-sans text-slate-800">
        <main className="flex-1 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200/50">
              <div className="bg-emerald-500 px-8 py-10 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                  <CheckCircle size={40} strokeWidth={2.4} />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">Payment Successful</h1>
                <p className="mt-2 text-sm text-emerald-50">KES {formatKes(successData.amount)} paid toward {displayReference}</p>
                {successData.receipt && <p className="mt-1 font-mono text-xs text-emerald-100">Receipt: {successData.receipt}</p>}
              </div>
              
              <div className="p-6">
                {successData.newOutstanding != null && (
                  <div className="mb-6 flex items-center justify-between rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <span className="text-sm font-medium text-slate-500">New Outstanding Balance</span>
                    <span className="text-lg font-bold text-slate-900">KES {formatKes(successData.newOutstanding)}</span>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button onClick={downloadReceipt} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    <Download size={16} /> Receipt
                  </button>
                  <button onClick={shareReceipt} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700">
                    <Share2 size={16} /> Share
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-slate-400">Taking you to your loan details…</p>
                  <button onClick={() => { if (redirectRef.current) clearTimeout(redirectRef.current); router.push(`/loans/${loanId}`); }} className="mt-2 text-sm font-bold text-[#0a5cbe] hover:underline">
                    Go now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ─── MAIN LAYOUT ─────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-full overflow-hidden bg-[#F4F7FB] font-sans text-slate-800">
      
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden w-[250px] shrink-0 flex-col bg-gradient-to-b from-[#0b2a57] to-[#0a2247] text-white lg:flex">
        <div className="px-5 pb-2 pt-7">
          <Logo dark />
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-4">
          <button onClick={() => router.push('/dashboard')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <Home size={19} strokeWidth={1.8} className="text-slate-300" /> Home
          </button>
          <button onClick={() => router.push('/loans')} className="flex w-full items-center gap-3.5 rounded-xl bg-[#1565d8] px-4 py-3 text-[14px] font-medium text-white shadow-lg shadow-blue-900/30">
            <WalletCards size={19} strokeWidth={1.8} className="text-white" /> Loans
          </button>
          <button onClick={() => router.push('/payments')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <Receipt size={19} strokeWidth={1.8} className="text-slate-300" /> Payments
          </button>
          <button onClick={() => router.push('/m-pesa')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <Smartphone size={19} strokeWidth={1.8} className="text-slate-300" /> M-PESA Services
          </button>
          <button onClick={() => router.push('/savings')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <PiggyBank size={19} strokeWidth={1.8} className="text-slate-300" /> Savings
          </button>
          <button onClick={() => router.push('/credit-score')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <Shield size={19} strokeWidth={1.8} className="text-slate-300" /> Credit Score
          </button>
          <button onClick={() => router.push('/transactions')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <Compass size={19} strokeWidth={1.8} className="text-slate-300" /> Transactions
          </button>
          <button onClick={() => router.push('/products')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <Briefcase size={19} strokeWidth={1.8} className="text-slate-300" /> Products
          </button>
          <button onClick={() => router.push('/support')} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white">
            <HelpCircle size={19} strokeWidth={1.8} className="text-slate-300" /> Support
          </button>
        </nav>

        {/* Promo footer */}
        <div className="relative m-4 overflow-hidden rounded-2xl bg-white/[0.06] p-5">
          <svg className="pointer-events-none absolute -bottom-2 -right-2 h-32 w-48" viewBox="0 0 200 130" fill="none">
            <path d="M0 130 C 60 110, 120 70, 200 0 L200 130 Z" fill="url(#sw1)" opacity="0.9" />
            <path d="M20 130 C 80 120, 140 90, 200 40 L200 130 Z" fill="#0a5cbe" opacity="0.7" />
            <defs>
              <linearGradient id="sw1" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#16a34a" />
                <stop offset="1" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <Leaf size={24} className="relative mb-3 text-emerald-400" fill="currentColor" />
          <p className="relative text-[15px] font-bold leading-snug">Your financial<br />journey, made easier.</p>
          <p className="relative mt-2 text-[10px] text-slate-300">Borrow • Save • Pay • Grow</p>
          <div className="h-14" />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200">
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Repayment</p>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Pay {displayReference}</h1>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5 shrink-0">
            <button className="relative grid h-10 w-10 place-items-center rounded-full bg-white border border-slate-100 text-slate-600 transition hover:bg-slate-50">
              <Bell size={20} strokeWidth={2} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>
            
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316] text-sm font-bold text-white shrink-0">
                SC
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-bold text-slate-900">Samuel Chaga</p>
                <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                  <ChevronRight size={12} className="rotate-90" /> View Profile
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="mx-auto max-w-[1000px] p-4 sm:p-8">
            
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
              
              {/* LEFT COLUMN: PAYMENT FORM */}
              <div className="space-y-6">
                
                {!repayable && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                    This loan cannot be repaid right now (status: {loan.status}).
                  </div>
                )}

                {repayable && flow === 'pending' && (
                  <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/50">
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-blue-50 ring-8 ring-blue-50/50">
                      <Smartphone className="h-8 w-8 animate-pulse text-[#0a5cbe]" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-slate-900">Waiting for confirmation</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Check your phone and enter your M-Pesa PIN for <strong className="text-slate-900">KES {formatKes(amount)}</strong>.
                    </p>
                    
                    <div className="mt-6 space-y-4 text-left max-w-xs mx-auto">
                      {['Request sent to your phone', 'Enter your PIN', 'Confirming with M-Pesa'].map((label, idx) => {
                        const active = pollCount < 1 ? 0 : pollCount < 3 ? 1 : 2;
                        const done = idx < active;
                        const current = idx === active;
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-500' : current ? 'bg-[#0a5cbe]' : 'bg-slate-100'}`}>
                              {done ? <Check className="h-3.5 w-3.5 text-white" /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : null}
                            </div>
                            <span className={`text-sm ${idx <= active ? 'font-bold text-slate-900' : 'text-slate-400'}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-slate-50 py-2 text-xs font-medium text-slate-500">
                      <WifiOff className="h-3.5 w-3.5" /> Checking status automatically...
                    </div>

                    <button onClick={resetToIdle} className="mt-6 text-xs font-bold text-[#0a5cbe] underline hover:text-blue-800">
                      I didn't receive a prompt — start over
                    </button>
                  </div>
                )}

                {repayable && flow !== 'pending' && (
                  <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50">
                    <h3 className="mb-5 text-lg font-bold text-slate-900">Pay with M-Pesa</h3>
                    
                    <div className="space-y-5">
                      <label className="block">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">M-Pesa Number</span>
                        <div className="relative mt-2">
                          <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input
                            className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-11 text-base font-medium focus-visible:ring-[#0a5cbe]/40"
                            inputMode="tel"
                            placeholder="07XX XXX XXX"
                            value={phone}
                            onChange={(e) => { setErrorMsg(null); setPhone(e.target.value); }}
                            disabled={flow === 'processing'}
                          />
                        </div>
                        {phoneError && <p className="mt-2 text-xs font-medium text-red-600">Enter a valid M-Pesa number</p>}
                      </label>

                      <label className="block">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount (KES)</span>
                        <div className="relative mt-2">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">KES</span>
                          <Input
                            className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 text-base font-bold focus-visible:ring-[#0a5cbe]/40"
                            inputMode="numeric"
                            placeholder={String(Math.round(outstanding))}
                            value={amountInput}
                            onChange={(e) => { setErrorMsg(null); setAmountInput(e.target.value.replace(/\D/g, '')); }}
                            disabled={flow === 'processing'}
                          />
                        </div>
                        {amountError && (
                          <p className="mt-2 text-xs font-medium text-red-600">
                            {amount <= 0 ? 'Enter an amount' : `Maximum is KES ${formatKes(outstanding)}`}
                          </p>
                        )}
                      </label>

                      {flow === 'error' && errorMsg && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                          <div className="flex items-start gap-3">
                            <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                            <div>
                              <p className="text-sm font-bold text-red-800">Payment Failed</p>
                              <p className="mt-1 text-xs text-red-700">{errorMsg}</p>
                            </div>
                          </div>
                          <button onClick={resetToIdle} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
                            Try Again
                          </button>
                        </div>
                      )}

                      {flow === 'idle' && errorMsg && (
                        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                          <p className="text-sm font-medium text-red-700">{errorMsg}</p>
                        </div>
                      )}

                      <Button
                        onClick={onRequestStk}
                        disabled={flow === 'processing'}
                        className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0a5cbe] text-sm font-bold text-white shadow-sm hover:bg-[#084a99] disabled:opacity-60"
                      >
                        {flow === 'processing' ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send M-Pesa request'}
                      </Button>
                    </div>
                  </div>
                )}

                {repayable && flow !== 'pending' && (
                  <button onClick={() => setShowPaybill(true)} className="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/50 transition hover:bg-slate-50">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#0a5cbe]">
                      <HelpCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">Having trouble?</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">Pay via Paybill instead</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                )}

              </div>

              {/* RIGHT COLUMN: SUMMARY */}
              <div className="lg:sticky lg:top-6 h-fit">
                <div className="rounded-xl bg-[#0a5cbe] p-6 text-white shadow-lg">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Outstanding Balance</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">KES {formatKes(loan.outstanding_total)}</p>
                  <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-sm font-medium text-blue-100">
                    <Clock3 size={16} /> Due {formatDate(dueDate)}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-slate-200 bg-white px-2 py-3 lg:hidden">
        <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Home size={22} /><span className="text-[10px] font-medium">Home</span>
        </button>
        <button onClick={() => router.push('/apply')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <Compass size={22} /><span className="text-[10px] font-medium">Apply</span>
        </button>
        <button onClick={() => router.push('/loans')} className="flex flex-col items-center gap-1 text-[#0a5cbe]">
          <FileText size={22} /><span className="text-[10px] font-bold">Loans</span>
        </button>
        <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600">
          <HelpCircle size={22} /><span className="text-[10px] font-medium">Profile</span>
        </button>
      </nav>

      <PaybillSheet open={showPaybill} onClose={() => setShowPaybill(false)} accountNumber={accountNumber} />
    </div>
  );
}