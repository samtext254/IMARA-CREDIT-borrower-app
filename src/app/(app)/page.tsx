'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F8] font-sans text-slate-800">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex h-[64px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-[#0077C8] hover:underline">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <span className="text-sm font-bold text-slate-900">Imara Credit</span>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
        {/* Title block */}
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0077C8]">Legal</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Loan Terms and Conditions
          </h1>
          <div className="mt-4 space-y-1 text-sm text-slate-500">
            <p><span className="font-semibold text-slate-700">Effective Date:</span> [Insert Date]</p>
            <p><span className="font-semibold text-slate-700">Business Name:</span> Imara Credit</p>
            <p><span className="font-semibold text-slate-700">Jurisdiction:</span> Republic of Kenya</p>
          </div>
        </div>

        {/* Content card */}
        <article className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200/50 sm:p-10">
          <div className="space-y-8 text-[15px] leading-relaxed text-slate-700">

            {/* 1 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">1. Introduction</h2>
              <p>
                Welcome to Imara Credit. These Terms and Conditions govern the application,
                approval, disbursement, repayment and recovery of loans issued by Imara Credit.
              </p>
              <p className="mt-3">
                By applying for and accepting a loan, the borrower agrees to the terms disclosed
                in the individual loan agreement, subject to applicable Kenyan law.
              </p>
              <p className="mt-3">
                Imara Credit aims to provide responsible lending services with transparency,
                fairness and accountability.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">2. Eligibility for a Loan</h2>
              <p className="mb-3">To qualify for a loan, an applicant must:</p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>Be at least 18 years old and legally capable of entering into a contract.</li>
                <li>Provide accurate and complete identification and contact information.</li>
                <li>Demonstrate a reasonable ability to repay the proposed loan.</li>
                <li>Provide any supporting information or documentation reasonably required for the assessment.</li>
                <li>Agree to the applicable loan amount, interest, repayment schedule and other disclosed charges.</li>
                <li>Satisfy any additional eligibility requirements communicated by Imara Credit.</li>
              </ol>
              <p className="mt-3">
                Submitting an application does not guarantee approval. Imara Credit reserves the
                right to decline an application based on lawful and fair lending criteria.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">3. Loan Approval and Disbursement</h2>
              <p className="mb-3">
                Every approved loan shall have an individual loan agreement or written loan
                confirmation specifying:
              </p>
              <ul className="list-disc space-y-1.5 pl-6">
                <li>Approved principal amount.</li>
                <li>Interest rate and method of calculation.</li>
                <li>Total amount payable.</li>
                <li>Loan duration and repayment deadline.</li>
                <li>Repayment method and instalment schedule, where applicable.</li>
                <li>Any applicable fees or late-payment charges.</li>
                <li>Any agreed security or guarantee, where applicable.</li>
              </ul>
              <p className="mt-3">
                The borrower should review and accept these terms before the loan is disbursed.
                Disbursement shall be made through an agreed payment method, and a record of the
                transaction shall be maintained.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">4. Interest and Loan Charges</h2>
              <p>
                The applicable interest rate, calculation method and total cost of borrowing shall
                be communicated to the borrower before acceptance.
              </p>
              <p className="mt-3">
                Unless expressly agreed otherwise in writing, no additional fee or charge shall be
                imposed without a lawful basis and appropriate disclosure.
              </p>
              <p className="mt-3">
                The borrower shall be provided with a clear breakdown of the principal, interest
                and any applicable charges.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">5. Repayment Obligations</h2>
              <p>The borrower agrees to repay the loan according to the agreed repayment schedule.</p>
              <p className="mt-3">
                Repayment may be made through the payment channel specified by Imara Credit. The
                borrower should retain transaction messages, receipts or other proof of payment.
              </p>
              <p className="mt-3">
                A payment shall be credited to the borrower's account and reflected in the loan
                records. The borrower may request an updated statement showing the outstanding
                balance and payments received.
              </p>
              <p className="mt-3">
                The borrower should contact Imara Credit promptly if they anticipate difficulty
                meeting a repayment deadline.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">6. Late Payments and Default</h2>
              <p>
                A borrower may be considered in default if they fail to make a payment by the
                agreed deadline, subject to the loan agreement and applicable law.
              </p>
              <p className="mb-3 mt-3">Where a payment is overdue:</p>
              <ol className="list-decimal space-y-2 pl-6">
                <li>Imara Credit may send a reasonable payment reminder.</li>
                <li>The borrower may be asked to explain the delay and discuss a suitable repayment arrangement.</li>
                <li>Any late-payment charge must have been disclosed in advance, agreed where required, and be lawful and enforceable.</li>
                <li>Imara Credit may pursue lawful debt-recovery measures if the outstanding amount remains unpaid.</li>
              </ol>
              <p className="mt-3">
                No undisclosed penalties, unlawful threats, harassment or abusive collection
                practices shall be permitted. Applicable legal limits on interest and recovery
                shall be observed.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">7. Early Repayment</h2>
              <p>A borrower may request to repay a loan before its scheduled maturity date.</p>
              <p className="mt-3">
                The applicable interest adjustment, if any, shall be determined by the loan
                agreement and applicable law. Any early-repayment charge must be disclosed in
                advance and must be lawful.
              </p>
              <p className="mt-3">
                The borrower may request a settlement statement confirming the amount required to
                clear the loan.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">8. Borrower Responsibilities</h2>
              <p className="mb-3">The borrower agrees to:</p>
              <ul className="list-disc space-y-1.5 pl-6">
                <li>Provide truthful and accurate information.</li>
                <li>Use the loan for lawful purposes.</li>
                <li>Make repayments on time.</li>
                <li>Notify Imara Credit of material changes to their contact information.</li>
                <li>Report suspected payment errors or unauthorized transactions promptly.</li>
                <li>Cooperate reasonably in resolving outstanding account issues.</li>
              </ul>
              <p className="mt-3">
                Providing false information or deliberately using fraudulent documents may result
                in an application being declined or appropriate lawful action being taken.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">9. Privacy and Personal Data</h2>
              <p>
                Imara Credit shall handle personal information in accordance with applicable
                Kenyan data-protection law.
              </p>
              <p className="mt-3">
                Personal information may be collected and processed for legitimate purposes,
                including identity verification, credit assessment, loan administration, payment
                reconciliation, fraud prevention and lawful debt recovery.
              </p>
              <p className="mt-3">
                Access to personal information shall be restricted to authorized persons and
                legitimate service providers, subject to applicable legal requirements.
              </p>
              <p className="mt-3">
                Imara Credit shall not sell or disclose borrower information unlawfully. Where
                separate consent is required by law, it shall be obtained appropriately.
              </p>
              <p className="mt-3">
                Borrowers may exercise applicable rights concerning their personal information,
                including requesting access to or correction of inaccurate information.
              </p>
              <p className="mt-3">
                Further details shall be provided in Imara Credit's Privacy Notice and any
                required consent documents.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">10. Communication and Debt Collection</h2>
              <p>
                Imara Credit may communicate with borrowers using the contact details and channels
                provided, for purposes related to applications, payments, account updates and
                overdue balances.
              </p>
              <p className="mt-3">
                All collection communications must be lawful, respectful and proportionate.
              </p>
              <p className="mt-3">
                Imara Credit shall not use intimidation, public shaming, abusive language,
                unauthorized contact with third parties or unlawful disclosure of debt information
                to compel repayment.
              </p>
              <p className="mt-3">
                Any guarantor or other third party may be contacted only where legally permitted
                and in accordance with the applicable agreement and data-protection requirements.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">11. Complaints and Disputes</h2>
              <p>
                A borrower who has a complaint concerning a loan, payment, balance, charge or
                collection activity should contact Imara Credit and provide the relevant details.
              </p>
              <p className="mt-3">
                Imara Credit shall review complaints fairly and seek to resolve them within a
                reasonable period.
              </p>
              <p className="mt-3">
                If a dispute cannot be resolved directly, either party may pursue the remedies
                available under applicable Kenyan law.
              </p>
              <p className="mt-3">
                Nothing in these Terms and Conditions prevents a borrower from approaching a
                competent court or relevant regulatory authority.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">12. Amendments to These Terms</h2>
              <p>
                Imara Credit may revise these Terms and Conditions when necessary to reflect
                changes in its services or applicable law.
              </p>
              <p className="mt-3">
                Any material changes shall be communicated appropriately. Changes shall not
                retrospectively alter an existing borrower's agreed financial obligations without
                a lawful basis and any required consent.
              </p>
              <p className="mt-3">
                The specific loan agreement shall govern the particular loan, subject to
                applicable law.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">13. Governing Law</h2>
              <p>
                These Terms and Conditions shall be interpreted in accordance with the laws of the
                Republic of Kenya.
              </p>
              <p className="mt-3">
                Any contractual provision found to be unlawful or unenforceable shall be treated in
                accordance with applicable law, without automatically invalidating the remaining
                provisions.
              </p>
            </section>

          </div>

          {/* Footer */}
          <div className="mt-10 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Imara Credit. All rights reserved.
          </div>
        </article>

        <div className="mt-8 flex justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0077C8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0060a3]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}