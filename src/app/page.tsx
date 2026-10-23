
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const SLIDES = [
  'https://www.gainhealth.org/sites/default/files/2025-02/dsc07855.jpg',
  'https://www.gainhealth.org/sites/default/files/2025-02/com_8080.jpg',
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQe-cJfJ62BEYmDkKr5sppuMwNUkjvxMulILR22yG77fREb77h-72Y3SBJ&s=10',
];

const NAVY = '#102F5E';
const GOLD = '#E9B63F';

function BrandLogo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <svg
        viewBox="0 0 80 80"
        className="h-12 w-12"
        fill="none"
        aria-hidden="true"
      >
        <path d="M8 65 Q38 77 72 56" stroke={NAVY} strokeWidth="5" />
        <path d="M17 55V36L29 30V55Z" fill={GOLD} />
        <path d="M33 55V22L45 15V55Z" fill={GOLD} />
        <path d="M49 55V10L61 4V55Z" fill={GOLD} />
      </svg>
      <span className="leading-tight">
        <span
          className={`block text-xl font-black tracking-[0.12em] ${
            light ? 'text-white' : 'text-[#102F5E]'
          }`}
        >
          IMARA
        </span>
        <span
          className={`block text-[10px] font-bold tracking-[0.27em] ${
            light ? 'text-white/80' : 'text-[#102F5E]'
          }`}
        >
          CAPITAL KENYA
        </span>
        <span className={`mt-0.5 block text-[9px] ${
          light ? 'text-white/70' : 'text-slate-500'
        }`}>
          Your Goals. Our Support.
        </span>
      </span>
    </Link>
  );
}

function LandingContent() {
  const searchParams = useSearchParams();
  const merchantId = searchParams.get('m');
  const lenderSlug = searchParams.get('lender');

  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState('10000');
  const [loanMonths, setLoanMonths] = useState('3');
  const [monthlyEstimate, setMonthlyEstimate] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % SLIDES.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const loginParams = new URLSearchParams();
  if (merchantId) loginParams.set('m', merchantId);
  if (lenderSlug) loginParams.set('lender', lenderSlug);

  const queryString = loginParams.toString();
  const loginUrl = `/login${queryString ? `?${queryString}` : ''}`;

  // This is an illustrative estimate only. It assumes zero interest
  // and excludes fees. Replace it with your actual loan pricing formula.
  function calculateRepayment() {
    const amount = Number(loanAmount);
    const months = Number(loanMonths);

    if (!Number.isFinite(amount) || amount <= 0 || months <= 0) {
      setMonthlyEstimate(null);
      return;
    }

    setMonthlyEstimate(amount / months);
  }

  const money = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 2,
    }).format(amount);

  const whatsappUrl =
    'https://wa.me/?text=' +
    encodeURIComponent(
      'Hello Imara Capital Kenya, I would like to learn more about your loan services.'
    );

  const navItems = [
    { label: 'Home', href: '#home' },
    { label: 'Loans', href: '#loans' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white font-sans text-[#102F5E]">
      {/* HEADER */}
      <header className="relative z-30 border-b border-slate-100 bg-white">
        <div className="mx-auto flex min-h-[82px] max-w-[1440px] items-center justify-between gap-5 px-5 py-3 sm:px-8 lg:px-12">
          <BrandLogo />

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-sm transition hover:text-[#C58F18] ${
                  index === 0
                    ? 'border-b-2 border-[#E9B63F] py-2 font-bold'
                    : 'font-medium'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href={loginUrl}
            className="hidden rounded-xl bg-[#E9B63F] px-5 py-3 text-sm font-extrabold text-[#102F5E] shadow-sm transition hover:bg-[#F3CB68] sm:inline-flex"
          >
            Apply for a Loan
          </Link>

          <button
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-slate-200 p-2 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {mobileMenuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="flex flex-col gap-1 border-t border-slate-100 bg-white px-6 py-4 lg:hidden">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                {item.label}
              </a>
            ))}
            <Link
              href={loginUrl}
              className="mt-2 rounded-xl bg-[#E9B63F] px-4 py-3 text-center font-bold"
            >
              Apply for a Loan
            </Link>
          </nav>
        )}
      </header>

      {/* HERO */}
      <section
        id="home"
        className="relative isolate min-h-[530px] overflow-hidden bg-[#102F5E] lg:min-h-[550px]"
      >
        {SLIDES.map((src, index) => (
          <div
            key={src}
            aria-hidden="true"
            className={`absolute inset-0 -z-20 bg-cover bg-center transition-opacity duration-1000 ${
              currentSlide === index ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url("${src}")` }}
          />
        ))}

        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#08254D] via-[#102F5E]/95 to-[#102F5E]/35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#08254D]/60 to-transparent" />

        <div className="mx-auto grid min-h-[530px] max-w-[1440px] items-center gap-8 px-6 py-16 sm:px-10 lg:min-h-[550px] lg:grid-cols-[1.05fr_0.95fr] lg:px-16">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#F3C34F] sm:text-sm">
              IMARA CAPITAL KENYA
            </p>

            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Financial Support for Your Next Step.
              <span className="mt-1 block text-[#F3C34F]">
                Your Goals Matter.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-white/90 sm:text-lg">
              Explore financial solutions designed around your goals. Whether
              you need support for personal plans or your business, take the
              first step with Imara Capital Kenya.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={loginUrl}
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#E9B63F] px-7 py-4 font-extrabold text-[#102F5E] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#F4CD71]"
              >
                Apply for a Loan
                <span aria-hidden="true">→</span>
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex min-h-14 items-center justify-center rounded-xl border border-white/60 px-7 py-4 font-bold text-white transition hover:bg-white/10"
              >
                How It Works
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-4 text-sm text-white/90">
              <span>✓ Clear application steps</span>
              <span>✓ Convenient online access</span>
              <span>✓ Customer support</span>
            </div>

            <div className="mt-7 flex gap-2" aria-label="Hero slides">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide}
                  type="button"
                  aria-label={`Show slide ${index + 1}`}
                  aria-pressed={currentSlide === index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentSlide === index
                      ? 'w-9 bg-[#E9B63F]'
                      : 'w-3 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="hidden items-center justify-center lg:flex">
            <div className="max-w-sm rounded-3xl border border-white/30 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-md">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E9B63F] text-3xl text-[#102F5E]">
                ↗
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#F3C34F]">
                Your goals. Our support.
              </p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight">
                Take a confident step towards your plans.
              </h2>
              <p className="mt-4 leading-7 text-white/80">
                Start your application online and follow the steps to submit
                your request for review.
              </p>
              <Link
                href={loginUrl}
                className="mt-7 inline-flex font-bold text-[#F3C34F] hover:text-white"
              >
                Get started <span className="ml-2">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LOAN SOLUTIONS */}
      <section id="loans" className="scroll-mt-20 px-6 py-16 sm:px-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#B78319] sm:text-sm">
              OUR FINANCIAL SOLUTIONS
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Financial Solutions for Your Needs
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Explore the options available through Imara Capital Kenya.
              Contact our team to confirm eligibility, applicable fees and
              repayment terms.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: '♙',
                title: 'Personal Loans',
                text: 'Explore financial support for personal needs and important plans.',
              },
              {
                icon: '▥',
                title: 'Business Support',
                text: 'Explore financing options for business needs and growth plans.',
              },
              {
                icon: '⌂',
                title: 'Family Needs',
                text: 'Consider financial options for essential household expenses.',
              },
              {
                icon: '↗',
                title: 'Unexpected Expenses',
                text: 'Find out what options may be available for unplanned costs.',
              },
            ].map((loan) => (
              <article
                key={loan.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-[#E9B63F] hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4D9] text-3xl text-[#102F5E]">
                  {loan.icon}
                </div>
                <h3 className="mt-5 text-lg font-extrabold">{loan.title}</h3>
                <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">
                  {loan.text}
                </p>
                <Link
                  href={loginUrl}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[#102F5E] hover:text-[#B78319]"
                >
                  Get started <span>→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* LOAN CALCULATOR */}
      <section className="px-5 pb-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1350px] overflow-hidden rounded-3xl bg-[#102F5E] shadow-xl lg:grid-cols-2">
          <div className="flex flex-col justify-center p-7 text-white sm:p-10 lg:p-12">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F3C34F] sm:text-sm">
              LOAN CALCULATOR
            </p>
            <h2 className="mt-4 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">
              Plan Your Potential Repayments
            </h2>
            <p className="mt-5 max-w-md leading-7 text-white/80">
              Adjust the amount and repayment period to see an illustrative
              monthly estimate. Actual repayments depend on the approved loan
              terms, interest and applicable fees.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#E9B63F] text-2xl text-[#E9B63F]">
                ▦
              </span>
              <span className="text-lg font-semibold italic text-white/90">
                Plan today.
                <br />
                Prepare for tomorrow.
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="rounded-2xl bg-white p-5 shadow-lg sm:p-7">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  calculateRepayment();
                }}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="loan-amount"
                    className="mb-2 block text-sm font-bold text-[#102F5E]"
                  >
                    Loan Amount (KES)
                  </label>
                  <input
                    id="loan-amount"
                    type="number"
                    min="1"
                    max="100000000"
                    step="1"
                    required
                    value={loanAmount}
                    onChange={(event) => {
                      setLoanAmount(event.target.value);
                      setMonthlyEstimate(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-[#102F5E] outline-none focus:border-[#D6A52E] focus:ring-2 focus:ring-[#E9B63F]/30"
                  />
                </div>

                <div>
                  <label
                    htmlFor="loan-term"
                    className="mb-2 block text-sm font-bold text-[#102F5E]"
                  >
                    Repayment Period
                  </label>
                  <select
                    id="loan-term"
                    value={loanMonths}
                    onChange={(event) => {
                      setLoanMonths(event.target.value);
                      setMonthlyEstimate(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[#102F5E] outline-none focus:border-[#D6A52E] focus:ring-2 focus:ring-[#E9B63F]/30"
                  >
                    <option value="1">1 month</option>
                    <option value="2">2 months</option>
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#E9B63F] px-5 py-4 font-extrabold text-[#102F5E] transition hover:bg-[#F3CB68]"
                >
                  Calculate Estimate
                </button>
              </form>

              <div
                aria-live="polite"
                className="mt-5 rounded-xl bg-slate-50 p-4"
              >
                {monthlyEstimate === null ? (
                  <p className="text-sm leading-6 text-slate-600">
                    Enter your preferred loan amount and period to see an
                    illustrative estimate.
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-600">
                      Illustrative monthly amount
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-[#102F5E]">
                      {money(monthlyEstimate)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Principal divided evenly across the selected months.
                      This estimate excludes interest, fees and other charges
                      and is not a loan offer.
                    </p>
                  </>
                )}
              </div>

              <Link
                href={loginUrl}
                className="mt-5 flex w-full items-center justify-center rounded-xl border border-[#102F5E] px-5 py-3 font-bold text-[#102F5E] transition hover:bg-slate-50"
              >
                Continue to Application →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="scroll-mt-20 bg-[#F8FAFD] px-6 py-16 sm:px-10 lg:px-16 lg:py-20"
      >
        <div className="mx-auto max-w-[1200px]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#B78319] sm:text-sm">
              HOW IT WORKS
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Get Started in Four Steps
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              A straightforward guide to submitting your loan application.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: '01',
                icon: '▤',
                title: 'Apply Online',
                text: 'Open the application page and provide the requested information.',
              },
              {
                number: '02',
                icon: '⌕',
                title: 'Application Review',
                text: 'Your submitted details can be reviewed for eligibility.',
              },
              {
                number: '03',
                icon: '✓',
                title: 'Receive a Decision',
                text: 'Review the decision and any loan terms provided to you.',
              },
              {
                number: '04',
                icon: '↗',
                title: 'Follow Next Steps',
                text: 'If approved, follow the instructions provided for disbursement and repayment.',
              },
            ].map((step) => (
              <article key={step.number} className="relative text-center">
                <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full border border-[#F4DDA7] bg-[#FFF2D4] text-3xl font-bold text-[#102F5E]">
                  {step.icon}
                </div>
                <p className="mt-4 text-xs font-extrabold tracking-widest text-[#B78319]">
                  STEP {step.number}
                </p>
                <h3 className="mt-2 text-lg font-extrabold">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-[250px] text-sm leading-6 text-slate-600">
                  {step.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href={loginUrl}
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#E9B63F] px-8 py-4 font-extrabold text-[#102F5E] shadow-sm transition hover:bg-[#F3CB68]"
            >
              Start Your Application <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="scroll-mt-20 px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#B78319] sm:text-sm">
              ABOUT IMARA CAPITAL KENYA
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
              Your Goals. Our Support.
            </h2>
          </div>
          <p className="leading-8 text-slate-600">
            We aim to make exploring loan options and submitting an application
            straightforward. Before accepting a loan, review the offered
            amount, interest, fees, repayment schedule and applicable terms.
            Our team can help answer questions about the application process.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        id="contact"
        className="scroll-mt-20 relative overflow-hidden bg-[#0C2B55] px-6 py-12 sm:px-10 lg:px-16"
      >
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full border-[35px] border-white/5" />
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-7 lg:flex-row lg:items-center">
          <div className="max-w-2xl text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#F3C34F]">
              READY TO GET STARTED?
            </p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Take the Next Step Towards Your Goals
            </h2>
            <p className="mt-3 leading-7 text-white/80">
              Start your application online or contact us for assistance.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href={loginUrl}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#E9B63F] px-6 py-4 font-extrabold text-[#102F5E] hover:bg-[#F3CB68]"
            >
              Apply for a Loan <span>→</span>
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/40 px-6 py-4 font-bold text-white transition hover:bg-white/10"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12.04 2a9.8 9.8 0 0 0-8.39 14.86L2.3 22l5.27-1.38A9.93 9.93 0 0 0 12.04 22h.01A10 10 0 0 0 12.04 2Zm0 18.18a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.13.82.84-3.05-.2-.31a8.16 8.16 0 1 1 6.97 3.86Zm4.48-6.12c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-.1-.74-.67-1.24-1.5-1.39-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.4 1.02 2.57.12.16 1.75 2.67 4.25 3.74.59.25 1.06.4 1.42.51.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.19.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.28Z" />
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8 sm:px-10 lg:px-12">
        <div className="mx-auto flex max-w-[1350px] flex-col items-center justify-between gap-6 md:flex-row">
          <BrandLogo />

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-600">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition hover:text-[#B78319]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <p className="text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Imara Capital Kenya.
            <br />
            All rights reserved.
          </p>
        </div>

        <div className="mx-auto mt-6 flex max-w-[1350px] flex-wrap justify-center gap-5 border-t border-slate-100 pt-5 text-xs text-slate-500">
          <Link href="/terms" className="hover:text-[#102F5E]">
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className="hover:text-[#102F5E]">
            Privacy Policy
          </Link>
        </div>

        <p className="mx-auto mt-4 max-w-4xl text-center text-xs leading-5 text-slate-500">
          Loan applications are subject to review and approval. Actual loan
          amounts, interest, fees, eligibility and repayment terms are subject
          to the terms communicated by Imara Capital Kenya. The calculator
          provides an illustrative principal-only estimate and is not a loan
          offer.
        </p>
      </footer>
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#102F5E] p-8 text-white">
          Loading Imara Capital Kenya...
        </main>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
