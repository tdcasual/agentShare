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
    // 获取请求体
    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // 构建 headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // 跳过 host 和一些不需要的 headers
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    // 转发请求到后端
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // 重要：转发 cookies
      credentials: 'include',
    });

    // 构建响应
    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      // 跳过一次性的 headers
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
        message: 'Backend service is unavailable',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// 支持所有 HTTP 方法
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
