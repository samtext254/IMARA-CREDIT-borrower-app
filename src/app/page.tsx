'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const SLIDES = [
  'https://www.gainhealth.org/sites/default/files/2025-02/dsc07855.jpg',
  'https://www.gainhealth.org/sites/default/files/2025-02/com_8080.jpg',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQe-cJfJ62BEYmDkKr5sppuMwNUkjvxMulILR22yG77fREb77h-72Y3SBJ&s=10'
];

function LandingContent() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get('m');
  const lenderSlug = searchParams.get('lender');
  
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance the slider every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const loginParams = new URLSearchParams();
  if (merchantId) loginParams.set('m', merchantId);
  if (lenderSlug) loginParams.set('lender', lenderSlug);
  
  const queryString = loginParams.toString();
  const loginUrl = `/login${queryString ? `?${queryString}` : ''}`;

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between bg-black overflow-hidden font-sans">
      
      {/* Background Image Slider */}
      <div className="absolute inset-0 z-0">
        {SLIDES.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url("${src}")` }}
          />
        ))}
        
        {/* Deep gradient to make text readable, fading to solid black at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black" />
      </div>

      {/* ============ TOP SECTION: Logo & Headline ============ */}
      <div className="relative z-10 flex flex-col items-center pt-16 px-6 text-center w-full">
        
        {/* Slide Indicators (Dots) */}
        <div className="flex items-center gap-1.5 mb-8">
          {SLIDES.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Minimalist Logo */}
        <div className="mb-4 flex flex-col items-center">
          <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3">
            <path d="M30 30 L70 30 L30 70 L70 70" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" className="opacity-95"/>
            <path d="M70 30 L50 50 L70 70" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" className="opacity-95"/>
          </svg>
          
          <h1 className="text-white text-[26px] font-light tracking-[0.35em] uppercase pl-2">
            Imara
          </h1>
        </div>

        {/* Tagline */}
        <h2 className="text-white text-[22px] font-bold leading-[1.25] tracking-wide mt-4 uppercase">
          Smart Loans <br /> 
          For Smart People
        </h2>
      </div>

      {/* ============ BOTTOM SECTION: CTA & Legal ============ */}
      <div className="relative z-10 w-full px-6 pb-8 flex flex-col items-center mt-auto">
        
        {/* Big Yellow Pill Button */}
        <Link 
          href={loginUrl}
          className="w-full max-w-sm flex items-center justify-center bg-[#F4D03F] hover:bg-[#e5bc00] text-black font-extrabold text-[15px] py-[18px] rounded-full transition-transform active:scale-[0.98] mb-8 shadow-lg shadow-black/30"
        >
          GET STARTED
        </Link>

        {/* Legal Text */}
        <div className="text-center w-full max-w-[340px] space-y-2">
          <p className="text-white text-[11px] leading-[1.4]">
            By signing up you are agreeing to our{' '}
            <Link href="/terms" className="underline font-semibold">Terms & Conditions</Link>,{' '}
            <Link href="/terms" className="underline font-semibold">Terms of Use</Link>,{' '}
            <Link href="/privacy" className="underline font-semibold">Affiliation Policy</Link>,{' '}
            <Link href="/terms" className="underline font-semibold">PEP statement</Link> and{' '}
            <Link href="/privacy" className="underline font-semibold">Privacy Policy</Link>.
          </p>

          <p className="text-white/50 text-[8.5px] leading-[1.3] pt-2">
            Representative Example for First Loan: a 61-day loan with principal amount of Ksh 1,000, the processing fee would be Ksh 250 and the total amount due would be Ksh 1,250.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LandingContent />
    </Suspense>
  );
}