/**
 * Next.js Middleware - 服务端权限拦截
 * 
 * 在服务端层面对请求进行初步权限检查
 * 与客户端Route Guard形成双重保护
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROLE_LEVELS, type ManagementRole } from './lib/role-system';

// 路由角色映射（与客户端共享）
// 与后端 API 权限对齐
const ROUTE_ROLES: Record<string, ManagementRole> = {
  // admin级别（基础查看依赖 admin-only API）
  '/': 'admin',
  '/inbox': 'admin',
  
  // operator级别（操作+审批）
  '/tasks': 'operator',
  '/reviews': 'operator',
  '/approvals': 'operator',
  '/marketplace': 'operator',
  
  // viewer级别（后端只要求任意 management session）
  '/playbooks': 'viewer',
  '/runs': 'viewer',
  
  // admin级别（管理配置）
  '/identities': 'admin',
  '/tokens': 'admin',
  '/assets': 'admin',
  '/spaces': 'admin',
  '/settings': 'admin',
};

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
  return PUBLIC_ROUTES.some(route => 
    pathname.startsWith(route) || pathname === route
  );
}

/**
 * 获取路由所需角色
 */
function getRequiredRole(pathname: string): ManagementRole | null {
  // 精确匹配
  if (ROUTE_ROLES[pathname]) {
    return ROUTE_ROLES[pathname];
  }
  
  // 动态路由匹配
  for (const [route, role] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(route + '/')) {
      return role;
    }
  }
  
  return null;
}

/**
 * 解析session token获取角色
 * 简化版：只解析payload，不验证签名（由后端验证）
 */
function parseRoleFromToken(token: string): ManagementRole | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {return null;}
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.role as ManagementRole || null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 公开路由直接放行
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }
  
  // 获取session
  const sessionCookie = request.cookies.get('management_session')?.value;
  
  // 未登录且不是公开路由，添加标记供客户端处理
  if (!sessionCookie) {
    const response = NextResponse.next();
    response.headers.set('x-auth-required', 'true');
    return response;
  }
  
  // 解析角色
  const userRole = parseRoleFromToken(sessionCookie);
  
  // 检查角色权限
  const requiredRole = getRequiredRole(pathname);
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
