'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2, 
  Banknote, 
  Home as HomeIcon, 
  Car, 
  Briefcase, 
  Coins, 
  GraduationCap,
  ArrowRight
} from 'lucide-react';
import { loans as loansApi } from '@/lib/loans';
import type { LoanProduct, Loan, Eligibility } from '@/lib/loans';
import { getKycStatus, type KycStatusResponse } from '@/lib/kyc-api';

// Helper to pick icons and colors based on product name
function getProductStyle(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes('HOME')) {
    return { icon: HomeIcon, bg: 'bg-[#FFF7E6]', text: 'text-[#D97706]' }; // Amber
  }
  if (upper.includes('CAR')) {
    return { icon: Car, bg: 'bg-[#E8F4FF]', text: 'text-[#3B82F6]' }; // Blue
  }
  if (upper.includes('BUSINESS')) {
    return { icon: Briefcase, bg: 'bg-[#ECFDF3]', text: 'text-[#10B981]' }; // Green
  }
  if (upper.includes('MICRO')) {
    return { icon: Coins, bg: 'bg-[#F4EFFF]', text: 'text-[#8B5CF6]' }; // Purple
  }
  if (upper.includes('EDUCATION')) {
    return { icon: GraduationCap, bg: 'bg-[#FFEDED]', text: 'text-[#EF4444]' }; // Red
  }
  // Default: Personal Loan
  return { icon: Banknote, bg: 'bg-[#F4EFFF]', text: 'text-[#8B5CF6]' }; // Purple
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

  // Separate the main product (Personal Loan) from the rest
  const mainProduct = products.find(p => p.name.toUpperCase().includes('PERSONAL')) || products[0];
  const otherProducts = products.filter(p => p.id !== mainProduct?.id);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24">
      {/* NAV */}
      <div className="sticky top-0 z-30 bg-plum-700">
        <div className="flex items-center gap-3 px-5 py-4">
          <button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition active:scale-95">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <h1 className="text-[16px] font-semibold tracking-tight text-white">Explore Loans</h1>
        </div>
        <div className="h-1 w-full bg-brand-500" />
      </div>

      {error ? (
        <div className="p-6 text-center text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="p-6 text-center text-ink-500">No products available at the moment.</div>
      ) : (
        <div className="px-4 pt-4 space-y-6">
          
          {/* FEATURED PRODUCT (Yellow Hero Card) */}
          {mainProduct && (
            <section>
              <h2 className="text-[13px] font-bold text-ink-950 mb-3 uppercase tracking-wider">Featured Loan</h2>
              <div className="overflow-hidden rounded-3xl bg-brand-500 px-5 pt-5 pb-5 text-plum-800 shadow-[0_10px_28px_-12px_rgba(255,206,7,0.6)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plum-800/60">
                      {mainProduct.name}
                    </p>
                    <p className="mt-2 text-[28px] font-bold leading-none tracking-[-0.02em] text-plum-800 tabular-nums">
                      KES {Number(mainProduct.max_amount).toLocaleString()}
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium text-plum-800/60">
                      Up to {mainProduct.max_term_days} days · {mainProduct.interest_rate}% interest
                    </p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/30 text-plum-800">
                    <Banknote size={24} strokeWidth={2} />
                  </div>
                </div>
                
                <div className="my-4 h-px bg-plum-800/10" />
                
                <div className="flex justify-between text-[11px] text-plum-800/70 mb-4">
                  <span>Available limit: <strong className="font-bold text-plum-800">KES {eligibility?.credit_limit?.available_limit || '0'}</strong></span>
                  <span>Term: <strong className="font-bold text-plum-800">{mainProduct.min_term_days}-{mainProduct.max_term_days} days</strong></span>
                </div>

                <button onClick={() => handleApplyClick(mainProduct)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-plum-800 px-4 py-3 text-[13.5px] font-bold tracking-tight text-white transition active:scale-[0.985]">
                  Apply Now <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              </div>
            </section>
          )}

          {/* OTHER PRODUCTS */}
          {otherProducts.length > 0 && (
            <section>
              <h2 className="text-[13px] font-bold text-ink-950 mb-3 uppercase tracking-wider">More Options</h2>
              <div className="grid grid-cols-2 gap-3">
                {otherProducts.map((p) => {
                  const style = getProductStyle(p.name);
                  const Icon = style.icon;

                  return (
                    <div key={p.id} className="flex flex-col justify-between rounded-3xl border border-ink-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-col items-start text-left">
                        <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${style.bg} ${style.text}`}>
                          <Icon size={20} strokeWidth={2} />
                        </div>
                        <h3 className="text-[12px] font-bold text-ink-950 leading-tight">{p.name}</h3>
                        <p className="text-[10px] text-ink-500 mt-1">Up to KES {Number(p.max_amount).toLocaleString()}</p>
                      </div>

                      <button onClick={() => handleApplyClick(p)} className="mt-4 w-full rounded-lg border border-plum-200 bg-plum-50 py-2 text-[11px] font-bold text-plum-800 transition active:scale-[0.98]">
                        View Details
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}