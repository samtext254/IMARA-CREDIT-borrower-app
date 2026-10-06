# IMARA CREDIT - Borrower Web App

Repo:      C:\Project\imara-onlineservice
Runtime:   Next.js 15 (App Router) - React 19 - TypeScript - Tailwind 3
Dev port:  3002
Product:   IMARA CREDIT

## Persona
A customer of a merchant. They borrow from ONE lender.
They do not see other merchants, banks, or an admin console.

## Non-negotiables
1. Standalone repo - no imports from xecoflow-pay or XecoFlow-2Gen.
2. Talks to credit-service-engine client routes only (/api/v1/credit/*).
3. Never calls the engine from the browser - always through /api/lending/* proxy.
4. Auth flows through existing XecoFlow auth APIs (wired later).
5. All amounts are KES, decimal-safe, formatted via formatKES().

## Visual language
- Emerald primary (leaf-500 #10b981).
- White cards, rounded-2xl, soft shadow.
- Page background #f7f8f7.
- Mobile-first, max-width 28rem centered.
- Bottom nav: Home - Apply - Loans - Profile.

## Routes
- (auth)/login, (auth)/verify
- (app)/  - Home
- (app)/apply, (app)/apply/review, (app)/apply-done
- (app)/loans, (app)/loans/[id]
- (app)/repay/[id]
- (app)/profile
- (app)/notifications

## Cuts (not in v1)
- Loan Calculator tab
- Bank marketplace / category grid
- Language picker
- Support ticket system
- Notification bell badge counts

## Env
AUTH_API_URL=http://localhost:3001
LENDING_API_URL=http://localhost:4099
NEXT_PUBLIC_APP_URL=http://localhost:3002

## Milestones
- B1 - scaffold + shell + design tokens (THIS)
- B2 - auth wired to real endpoints; Home shows real eligibility
- B3 - apply flow (amount -> review -> done)
- B4 - loans list + detail
- B5 - repay via STK push + profile / KYC
- B6 - notifications feed