/**
 * API Proxy Route Handler for VaultGate
 *
 * Proxies all /api/* requests to the backend server
 * Handles CORS and credential forwarding
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.VAULTGATE_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Headers that should be forwarded to the backend
const FORWARD_HEADERS = [
  'content-type',
  'authorization',
  'cookie',
  'accept',
  'x-request-id',
];

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
    // Get request body
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // Build headers with whitelist
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (FORWARD_HEADERS.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // Forward request to backend
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      credentials: 'include',
    });

    // Build response
    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
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

    return NextResponse.json(
      {
        error: 'backend_unavailable',
        message: 'Backend service unavailable',
      },
      { status: 503 }
    );
  }
}

// Support all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
