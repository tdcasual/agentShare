/**
 * Route policy stubs for VaultGate.
 *
 * VaultGate has a simple model: all authenticated users can access all management routes.
 * These stubs exist for compatibility with the route-guard component.
 */

export interface RouteCheckResult {
  allowed: boolean;
  redirect?: string;
}

export function isRouteAllowed(_path: string, _sessionState: string): RouteCheckResult {
  // VaultGate has a simpler model — all authenticated users can access all routes
  return { allowed: true };
}

export function getRoutePolicy(_path: string): { mode?: string } {
  return {};
}

export function isDemoRoute(_path: string): boolean {
  return false;
}

export function isManagementRoute(path: string): boolean {
  return path.startsWith('/api/') || path === '/settings';
}
