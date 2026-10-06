import { NextRequest, NextResponse } from 'next/server';

// Proxy: /api/lending/* -> LENDING_API_URL/api/v1/credit/*
// Session wiring lands in a later step; for now we forward dev headers only.

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const base = process.env.LENDING_API_URL ?? 'http://localhost:4099';
  const upstream = `${base}/api/v1/credit/${path.join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const merchantId = req.headers.get('x-merchant-id');
  const customerId = req.headers.get('x-customer-id');
  if (merchantId) headers['x-merchant-id'] = merchantId;
  if (customerId) headers['x-customer-id'] = customerId;

  const idem = req.headers.get('x-idempotency-key');
  if (idem) headers['x-idempotency-key'] = idem;

  const init: RequestInit = { method: req.method, headers, cache: 'no-store' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  try {
    const res = await fetch(upstream, init);
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Lending engine unreachable' } },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;