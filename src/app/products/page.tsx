'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Menu, X, Home, Wallet, FileText, Settings, LogOut } from 'lucide-react';
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
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcynw6iH1mRImgvrkCgYsHWt_KedReJVBQYvMjpR65LaEInpv1l-kaxY&s=10',
      ctaText: 'Grow Now'
    };
  }
  if (upper.includes('EMERGENCY')) {
    return {
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSqKg-EhYLFA1w8lUzAgovdJ-eRPgXKuJTHULjmw75EfgZU4x9pN-X_fVb&s=10',
      ctaText: 'Get Help'
    };
  }
  if (upper.includes('HOME')) {
    return {
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600',
      ctaText: 'Build Now'
    };
  }
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
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    return <div className="min-h-screen bg-[#F8F9FA] grid place-items-center"><Loader2 className="animate-spin text-[#0056b3]" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 relative overflow-hidden">
      
      {/* SIDE DRAWER */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="relative w-72 bg-[#0056b3] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h2 className="text-[18px] font-bold text-white tracking-tight">Imara Credit</h2>
                <p className="text-[11px] text-white/70">Your goals. Our support.</p>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              <Link href="/home" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition">
                <Home size={18} /> Dashboard
              </Link>
              <Link href="/products" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/20 text-white font-bold transition">
                <Wallet size={18} /> Products
              </Link>
              <Link href="/loans" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition">
                <FileText size={18} /> My Loans
              </Link>
              <Link href="/notifications" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition">
                <ClockIcon size={18} /> Activity
              </Link>
              <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition">
                <Settings size={18} /> Settings
              </Link>
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={() => router.push('/login')} className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-white/80 hover:bg-red-500/20 hover:text-red-300 transition">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <div className="sticky top-0 z-30 bg-[#0056b3]">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => setIsMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition active:scale-95">
            <Menu size={20} strokeWidth={2.2} />
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
        <div className="mt-4">
          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scroll-bar gap-4 px-5 pb-8 pt-2">
            {products.map((p) => {
              const visuals = getProductVisuals(p.name);

              return (
                <div 
                  key={p.id} 
                  className="snap-center shrink-0 w-[240px] bg-white rounded-2xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-ink-100 overflow-hidden flex flex-col"
                >
                  <div className="h-[120px] w-full relative bg-ink-100">
                    <img 
                      src={visuals.image} 
                      alt={p.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[9px] font-bold text-[#0056b3]">
                      Up to KES {Number(p.max_amount).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="text-[13px] font-bold text-[#0a2540] leading-tight">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-[11px] text-ink-500 leading-snug flex-1">
                      Flexible terms up to {p.max_term_days} days.
                    </p>
                    
                    <button 
                      onClick={() => handleApplyClick(p)}
                      className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#D32F2F] transition active:opacity-60"
                    >
                      {visuals.ctaText}
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .hide-scroll-bar::-webkit-scrollbar { display: none; }
        .hide-scroll-bar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function ClockIcon({ size, ...props }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}