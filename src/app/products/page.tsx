'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Loader2, Shield, Info } from 'lucide-react';
import Link from 'next/link';
import { loans as loansApi } from '@/lib/loans';
import type { LoanProduct, Loan, Eligibility } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';

// Helper to get the right image and CTA text based on product name
function getProductVisuals(name: string) {
  const upper = name.toUpperCase();
  
  if (upper.includes('SALARY')) {
    return {
      image: 'https://mintcredit.co.ke/wp-content/uploads/2024/11/Understanding-Salary-Advance-e1730705618168.jpg',
      ctaText: 'Get Advance'
    };
  }
  if (upper.includes('PERSONAL')) {
    return {
      image: 'https://rafikibank.co.ke/wp-content/uploads/2026/01/Family-with-tablet.jpg',
      ctaText: 'Apply Now'
    };
  }
  if (upper.includes('BIASHARA') || upper.includes('BUSINESS')) {
    return {
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600',
      ctaText: 'Grow Now'
    };
  }
  if (upper.includes('EMERGENCY')) {
    return {
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600',
      ctaText: 'Get Help'
    };
  }
  // Fallback
  return {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600',
    ctaText: 'Apply Now'
  };
}

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

export default function LoanProductsPage() {
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
    if (activeLoan) {
      alert(`You already have an active loan (${activeLoan.loan_reference}). Please repay it before applying for a new one.`);
      return;
    }
    if (kycData?.kycStatus !== 'VERIFIED') {
      alert("Please complete your KYC profile before applying for a loan.");
      router.push('/kyc');
      return;
    }
    const userScore = eligibility?.credit_limit?.credit_score ?? 0;
    const minScore = product.min_credit_score ?? 0;

    if (userScore < minScore) {
      alert(`You are not eligible for this product. Your credit score is ${userScore}, but this product requires a minimum of ${minScore}. Please check other products.`);
      return;
    }
    router.push(`/apply/loan?productId=${product.id}`);
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1260px] space-y-5 pb-10">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[22px] font-bold text-[#0f2f66]">Loan Products</h1>
            <p className="text-[13px] text-slate-500">Choose the best financial solution for your needs.</p>
          </div>
        </div>
      </div>

      {/* ERROR / EMPTY STATES */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center font-semibold text-red-700">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <Info className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium">No products available at the moment.</p>
        </div>
      ) : (
        
        /* RESPONSIVE GRID (1 Col Mobile, 2 Col Tablet, 3 Col Desktop) */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const visuals = getProductVisuals(p.name);

            return (
              <div 
                key={p.id} 
                className={`${CARD} overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-emerald-100`}
              >
                {/* Image Header */}
                <div className="h-[140px] w-full relative bg-slate-100 shrink-0">
                  <img 
                    src={visuals.image} 
                    alt={p.name} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  
                  {/* Pill Badge */}
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#0f2f66] shadow-sm">
                    Up to KES {Number(p.max_amount).toLocaleString()}
                  </div>
                  
                  {/* Title over image */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-[16px] font-bold text-white leading-tight drop-shadow-md">
                      {p.name}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-emerald-600" />
                    <p className="text-[12px] font-medium text-slate-600">
                      Terms up to {p.max_term_days} days
                    </p>
                  </div>
                  
                  <p className="text-[13px] text-slate-500 leading-relaxed flex-1">
                    Quick approval and instant disbursement to your wallet.
                  </p>
                  
                  {/* CTA Button */}
                  <button 
                    onClick={() => handleApplyClick(p)}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 py-2.5 text-[13px] font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                  >
                    {visuals.ctaText}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}