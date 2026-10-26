'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import { loans as loansApi } from '@/lib/loans';
import type { LoanProduct, Loan, Eligibility } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';

// Helper to get the right image and CTA text based on product name
function getProductVisuals(name: string) {
  const upper = name.toUpperCase();
  
  if (upper.includes('HOME')) {
    return {
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600',
      ctaText: 'Build Now'
    };
  }
  if (upper.includes('CAR')) {
    return {
      image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&q=80&w=600',
      ctaText: 'Drive Now'
    };
  }
  if (upper.includes('BUSINESS')) {
    return {
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600',
      ctaText: 'Grow Now'
    };
  }
  if (upper.includes('EDUCATION')) {
    return {
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600',
      ctaText: 'Learn Now'
    };
  }
  // Default / Personal
  return {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600',
    ctaText: 'Apply Now'
  };
}

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
          <h1 className="text-[16px] font-semibold tracking-tight text-white">Loan Products</h1>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {error ? (
        <div className="p-6 text-center text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="p-6 text-center text-ink-500">No products available at the moment.</div>
      ) : (
        
        /* HORIZONTAL SCROLLING CAROUSEL */
        <div className="mt-4">
          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scroll-bar gap-4 px-5 pb-8 pt-2">
            {products.map((p) => {
              const visuals = getProductVisuals(p.name);

              return (
                <div 
                  key={p.id} 
                  className="snap-center shrink-0 w-[280px] bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-ink-100 overflow-hidden flex flex-col"
                >
                  {/* Image Header */}
                  <div className="h-[140px] w-full relative">
                    <img 
                      src={visuals.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-plum-800">
                      Up to KES {Number(p.max_amount).toLocaleString()}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-[15px] font-bold text-[#0a2540]">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-[12px] text-ink-500 leading-relaxed flex-1">
                      Flexible terms from {p.min_term_days} to {p.max_term_days} days. 
                      Get funded instantly to your M-Pesa.
                    </p>
                    
                    {/* CTA */}
                    <button 
                      onClick={() => handleApplyClick(p)}
                      className="mt-4 flex items-center gap-1 text-[12px] font-bold text-[#D32F2F] transition active:opacity-60"
                    >
                      {visuals.ctaText}
                      <ArrowRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="px-5 text-center mt-2">
            <p className="text-[11px] text-ink-400 font-medium">Swipe left to see more options</p>
          </div>
        </div>
      )}
      
      {/* Hide scrollbar utility style */}
      <style jsx global>{`
        .hide-scroll-bar::-webkit-scrollbar {
          display: none;
        }
        .hide-scroll-bar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}