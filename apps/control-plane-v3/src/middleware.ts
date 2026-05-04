import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveManagementSessionCookieName } from './lib/management-session-cookie';
import {
  ROLE_LEVELS,
  getRequiredRoleForPath,
  isValidRole,
  type ManagementRole,
} from './lib/role-system';

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

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route) || pathname === route);
}

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

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(sessionCookieName)?.value;

  if (!sessionCookie) {
    const response = NextResponse.next();
    response.headers.set('x-auth-required', 'true');
    return response;
  }

  const userRole = parseRoleFromToken(sessionCookie);

  const requiredRole = getRequiredRoleForPath(pathname);
  if (requiredRole && userRole) {
    const hasPermission = ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];

    if (!hasPermission) {
      const response = NextResponse.next();
      response.headers.set('x-forbidden', 'true');
      response.headers.set('x-required-role', requiredRole);
      response.headers.set('x-current-role', userRole);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
