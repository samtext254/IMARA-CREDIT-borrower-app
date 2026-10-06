import { NextRequest, NextResponse } from 'next/server';

// Proxy: /api/auth/* -> AUTH_API_URL/v1/auth/*
// NOTE: endpoint paths will be finalized once auth-engine routes are confirmed.

export const dynamic = 'force-dynamic';

async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const base = process.env.AUTH_API_URL ?? 'http://localhost:3001';
  const upstream = `${base}/v1/auth/${path.join('/')}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  };
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
      { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Auth engine unreachable' } },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;