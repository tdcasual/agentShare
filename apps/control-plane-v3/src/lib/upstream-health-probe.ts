/**
 * Upstream health/readiness passthrough for the API.
 *
 * In the Coolify topology all browser traffic lands on this Next.js app, so
 * /healthz and /readyz must be answered here: they forward to the FastAPI
 * backend and return its status code and body verbatim. In the standard
 * Caddy topology these paths are routed directly to the API at the edge and
 * never reach Next.js.
 *
 * Environment variables follow the same convention as the /api proxy:
 * VAULTGATE_API_URL (default http://localhost:8000) and
 * VAULTGATE_API_TIMEOUT_MS (default 15000).
 */

import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.VAULTGATE_API_URL || 'http://localhost:8000';
const API_TIMEOUT_MS = Number(process.env.VAULTGATE_API_TIMEOUT_MS || 15_000);

export async function proxyHealthCheck(endpoint: '/healthz' | '/readyz'): Promise<NextResponse> {
  try {
    const upstream = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      cache: 'no-store',
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    console.error(
      `Upstream ${endpoint} probe failed:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      { status: 'error' },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    );
  }
}
