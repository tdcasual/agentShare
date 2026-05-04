/**
 * Next.js Middleware - 服务端权限预检查（UX 层）
 *
 * ⚠️ 安全声明：此中间件仅用于 UX 预拦截，不验证 Cookie 签名。
 * 实际身份验证和授权校验由后端 API 层严格完成。
 * 此中间件不阻止页面渲染，也不暴露任何敏感数据；
 * 仅通过 HTTP Header（x-auth-required / x-forbidden）向客户端提示状态。
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveManagementSessionCookieName } from './lib/management-session-cookie';
import {
  ROLE_LEVELS,
  getRequiredRoleForPath,
  isValidRole,
  type ManagementRole,
} from './lib/role-system';

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

/**
 * 解析session token获取角色
 * 简化版：只解析payload，不验证签名（由后端验证）
 */
function parseRoleFromToken(token: string): ManagementRole | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const encodedPayload = parts[0];
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { role?: string };

    if (!payload.role || !isValidRole(payload.role)) {
      return null;
    }
    return payload.role;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookieName = resolveManagementSessionCookieName();

  // 公开路由直接放行
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 获取session
  const sessionCookie = request.cookies.get(sessionCookieName)?.value;

  // 未登录且不是公开路由，添加标记供客户端处理
  if (!sessionCookie) {
    const response = NextResponse.next();
    response.headers.set('x-auth-required', 'true');
    return response;
  }

  // 解析角色
  const userRole = parseRoleFromToken(sessionCookie);

  // 检查角色权限
  const requiredRole = getRequiredRoleForPath(pathname);
  if (requiredRole && userRole) {
    const hasPermission = ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];

    if (!hasPermission) {
      // 添加403标记，让客户端显示禁止页面
      const response = NextResponse.next();
      response.headers.set('x-forbidden', 'true');
      response.headers.set('x-required-role', requiredRole);
      response.headers.set('x-current-role', userRole);
      return response;
    }
  }

  // 正常访问
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
