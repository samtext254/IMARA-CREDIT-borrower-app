'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Banknote, Home as HomeIcon, Car, Briefcase, Coins, GraduationCap } from 'lucide-react';
import { loans as loansApi } from '@/lib/loans';
import type { LoanProduct, Loan, Eligibility } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';
import { imara } from '@/lib/api';

// Map icon names to components
const IconMap: Record<string, any> = {
  'PERSONAL LOAN': Banknote,
  'HOME LOAN': HomeIcon,
  'CAR LOAN': Car,
  'BUSINESS LOAN': Briefcase,
  'MICRO LOAN': Coins,
  'EDUCATION LOAN': GraduationCap,
};

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [kycData, setKycData] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch everything needed to check eligibility
        const [prodRes, eligRes, loansRes, kycRes] = await Promise.allSettled([
          loansApi.getProducts(),
          loansApi.getEligibility(),
          loansApi.getLoans({ limit: 5 }),
          getKycStatus(),
        ]);

        if (cancelled) return;

        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
        if (eligRes.status === 'fulfilled') setEligibility(eligRes.value.data);
        
        if (loansRes.status === 'fulfilled') {
          const list = loansRes.value.data || [];
          const active = list.find((l) => l.status === 'ACTIVE' || l.status === 'OVERDUE');
          setActiveLoan(active || null);
        }

        if (kycRes.status === 'fulfilled') setKycData(kycRes.value);

      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load products.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleApplyClick(product: LoanProduct) {
    // 1. Check for active/overdue loans
    if (activeLoan) {
      alert(`You already have an active loan (${activeLoan.loan_reference}). Please repay it before applying for a new one.`);
      return;
    }

    // 2. Check KYC
    if (kycData?.kycStatus !== 'VERIFIED') {
      alert("Please complete your KYC profile before applying for a loan.");
      router.push('/kyc');
      return;
    }

    // 3. Check Credit Score
    const userScore = eligibility?.credit_limit?.credit_score ?? 0;
    const minScore = product.min_credit_score ?? 0;

    if (userScore < minScore) {
      alert(`You are not eligible for this product. Your credit score is ${userScore}, but this product requires a minimum of ${minScore}. Please check other products.`);
      return;
    }

    // 4. Proceed to apply
    router.push(`/apply/loan?productId=${product.id}`);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#F8F9FA] grid place-items-center"><Loader2 className="animate-spin text-plum-800" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* NAV */}
      <div className="sticky top-0 z-30 bg-plum-700">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition active:scale-95">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <h1 className="text-[16px] font-semibold tracking-tight text-white">All Loan Products</h1>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {error ? (
        <div className="p-6 text-center text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="p-6 text-center text-ink-500">No products available at the moment.</div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {products.map((p) => {
            const Icon = IconMap[p.name.toUpperCase()] || Banknote;
            
            return (
              <div key={p.id} className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-plum-50 text-plum-700">
                    <Icon size={24} strokeWidth={2} />
                  </div>
                  <h3 className="text-[13px] font-bold text-ink-950 leading-tight">
                    {p.name}
                  </h3>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-ink-500">Max Loan</span>
                    <span className="font-semibold text-ink-900">
                      KES {Number(p.max_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-ink-500">Term</span>
                    <span className="font-semibold text-ink-900">
                      {p.min_term_days} - {p.max_term_days} days
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyClick(p)}
                  className="mt-4 w-full rounded-lg bg-plum-800 px-3 py-2 text-[12px] font-bold text-white transition active:scale-[0.98]"
                >
                  Apply Now
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}