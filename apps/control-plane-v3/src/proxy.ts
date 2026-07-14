/**
 * Next.js Proxy - 服务端权限预检查（UX 层）
 *
 * ⚠️ 安全声明：此代理仅用于 UX 预拦截，不验证 Cookie 签名。
 * 实际身份验证和授权校验由后端 API 层严格完成。
 * 此中间件不阻止页面渲染，也不暴露任何敏感数据；
 * 仅通过 HTTP Header（x-auth-required）向客户端提示状态。
 *
 * 重要修复：代理不再解析 cookie 内容或传播角色信息到 headers。
 * 角色解析完全由客户端通过 /session/me API 完成。
 * 这防止了客户端通过伪造 cookie 进行权限提升。
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 公开路由（无需认证）
const PUBLIC_ROUTES = [
  '/login',
  '/setup',
  '/logout',
  '/_next',
  '/api',
  '/favicon.ico',
  '/manifest.json',
  '/icons',
];

/**
 * 检查路由是否为公开路由
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route) || pathname === route);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路由直接放行
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Authentication state is resolved by the client route guard against the
  // server-side session endpoint. This proxy never interprets cookies.
  return NextResponse.next();
}

/**
 * 匹配器配置
 * 排除静态资源和API路由
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
