/**
 * API Proxy Route Handler for VaultGate
 *
 * Proxies all /api/* requests to the backend server.
 * Uses a strict header whitelist to prevent credential leakage.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.VAULTGATE_API_URL || 'http://localhost:8000';
const API_TIMEOUT_MS = Number(process.env.VAULTGATE_API_TIMEOUT_MS || 15_000);

// Only forward these request headers to the backend.
// cookie: required so backend session cookies authenticate management requests.
// authorization: required for runtime endpoints that use Bearer tokens.
const FORWARD_REQUEST_HEADERS = [
  'content-type',
  'accept',
  'x-request-id',
  'cookie',
  'authorization',
  'x-bootstrap-token',
  'origin',
  'referer',
];

// Only forward these response headers back to the client
const FORWARD_RESPONSE_HEADERS = ['content-type', 'set-cookie', 'cache-control', 'x-request-id'];

// Allowed backend URL schemes (prevent SSRF to non-HTTP services)
function validateBackendUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid backend URL scheme: ${parsed.protocol}`);
  }
}

type RouteParams = {
  params: Promise<{ path: string[] }>;
};

async function handleRequest(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();

  const targetUrl = `${API_BASE_URL}/api/${path}${searchParams ? `?${searchParams}` : ''}`;

  try {
    validateBackendUrl(targetUrl);

    // Get request body
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // Build headers with strict whitelist
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (FORWARD_REQUEST_HEADERS.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // Forward request to backend
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    // Build response with whitelisted headers only
    const responseBody =
      response.status === 204 || response.status === 304 ? null : await response.text();
    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      if (FORWARD_RESPONSE_HEADERS.includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error instanceof Error ? error.message : 'Unknown error');

    const errorName =
      error && typeof error === 'object' && 'name' in error ? String(error.name) : undefined;
    const timedOut = errorName === 'TimeoutError' || errorName === 'AbortError';

    return NextResponse.json(
      {
        detail: timedOut ? 'Backend request timed out' : 'Backend service unavailable',
        code: timedOut ? 'backend_timeout' : 'backend_unavailable',
      },
      { status: timedOut ? 504 : 503 }
    );
  }
}

// Support all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
