/**
 * VaultGate role system.
 *
 * VaultGate uses a single admin role for all authenticated users.
 * This module is kept as a thin shim for backwards compatibility.
 */

export type ManagementRole = 'admin';

export const ROLE_LEVELS: Record<ManagementRole, number> = {
  admin: 0,
};

export function hasRequiredRole(
  userRole: ManagementRole | null | undefined,
  _requiredRole: ManagementRole
): boolean {
  return userRole === 'admin';
}

export function isValidRole(role: string): role is ManagementRole {
  return role === 'admin';
}

export function getDefaultManagementRoute(_role: ManagementRole | null | undefined): string {
  return '/';
}

/**
 * Get the minimum role required for a given path.
 * All VaultGate routes are accessible to any authenticated admin user.
 */
export function getRequiredRoleForPath(_path: string): ManagementRole | null {
  return null;
}
