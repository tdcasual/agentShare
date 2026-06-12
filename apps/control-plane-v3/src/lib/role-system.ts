/**
 * Role system stubs for VaultGate.
 *
 * VaultGate uses a simpler admin/user model. This shim provides
 * compatibility for components that reference the old Agent Control Plane roles.
 * TODO (Phase 3): Remove once all consumers are updated.
 */

export type ManagementRole = 'viewer' | 'operator' | 'admin' | 'owner';

export const ROLE_LEVELS: Record<ManagementRole, number> = {
  viewer: 0,
  operator: 1,
  admin: 2,
  owner: 3,
};

export function hasRequiredRole(
  userRole: ManagementRole | undefined,
  requiredRole: ManagementRole,
): boolean {
  if (!userRole) return false;
  return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[requiredRole] ?? 0);
}

export function isValidRole(role: string): role is ManagementRole {
  return role in ROLE_LEVELS;
}

export function getDefaultManagementRoute(_role: ManagementRole | null | undefined): string {
  return '/';
}

/**
 * Get the minimum role required for a given path.
 * VaultGate has a simpler model — most routes require any authenticated user.
 */
export function getRequiredRoleForPath(_path: string): ManagementRole | null {
  // All VaultGate routes are accessible to any authenticated user
  return null;
}
