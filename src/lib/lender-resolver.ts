// imara-onlineservice/src/lib/lender-resolver.ts
//
// ─── LENDER RESOLVER ────────────────────────────────────────────
// Extracts the lender slug from any of the supported URL shapes:
//
//   1. Query:      /login?lender=acme-loans
//   2. Path:       /lender/acme-loans/login
//   3. Subdomain:  acme-loans.imara.app
//   4. Legacy:     /login?m=250084
//
// Precedence: query > path > subdomain > legacy merchantId.
// Returns { lender, merchantId } — exactly one is set.
// ────────────────────────────────────────────────────────────────

export interface ResolvedLender {
  lender: string | null;
  merchantId: number | null;
}

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

// Domains we do NOT treat as tenants.
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'docs',
  'static',
  'cdn',
  'assets',
]);

// The production root domain. Set via env when deploying.
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'imara.app')
  .toLowerCase()
  .trim();

export function resolveLender(opts: {
  search?: string;
  pathname?: string;
  hostname?: string;
}): ResolvedLender {
  const { search = '', pathname = '', hostname = '' } = opts;

  // ─── 1. Query param: ?lender=acme-loans ──────────────────────
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const qLender = (params.get('lender') || '').trim().toLowerCase();
  if (qLender && SLUG_REGEX.test(qLender)) {
    return { lender: qLender, merchantId: null };
  }

  // ─── 2. Path segment: /lender/acme-loans/... ─────────────────
  const pathMatch = pathname.match(/^\/lender\/([a-z0-9-]{3,50})(?:\/|$)/i);
  if (pathMatch) {
    const pLender = pathMatch[1].toLowerCase();
    if (SLUG_REGEX.test(pLender)) {
      return { lender: pLender, merchantId: null };
    }
  }

  // ─── 3. Subdomain: acme-loans.imara.app ──────────────────────
  const host = hostname.toLowerCase();
  if (host && ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, host.length - ROOT_DOMAIN.length - 1);
    // Only a single-label subdomain is a tenant.
    if (sub && !sub.includes('.') && !RESERVED_SUBDOMAINS.has(sub)) {
      if (SLUG_REGEX.test(sub)) {
        return { lender: sub, merchantId: null };
      }
    }
  }

  // ─── 4. Legacy: ?m=250084 ────────────────────────────────────
  const legacyM = (params.get('m') || params.get('merchantId') || '').trim();
  if (legacyM) {
    const n = parseInt(legacyM, 10);
    if (!isNaN(n) && n > 0) {
      return { lender: null, merchantId: n };
    }
  }

  return { lender: null, merchantId: null };
}