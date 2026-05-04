/**
 * API Proxy Route Handler
 *
 * 将所有 /api/* 请求代理到后端服务器
 * 解决跨域问题和凭证传递
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl } from '@/lib/backend-api-url';
import { logger } from '@/lib/logger';
import { resolveApiBaseUrl } from '@/lib/proxy-api-url';

type RouteParams = {
  params: Promise<{ path: string[] }>;
};

async function handleRequest(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const apiBaseUrl = resolveApiBaseUrl();
  const { path: pathSegments } = await params;
  const path = pathSegments.join('/');
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();

  const targetUrl = `${buildBackendApiUrl(apiBaseUrl, path)}${searchParams ? `?${searchParams}` : ''}`;

  try {

    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }


    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {

      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });


    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,

      credentials: 'include',
    });


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
    logger.api.error(`Proxy Error: ${targetUrl}`, error);

    return NextResponse.json(
      {
        error: 'backend_unavailable',
        message: '后端服务不可用',
        detail: error instanceof Error ? error.message : '未知错误',
      },
      { status: 503 }
    );
  }
}


export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
