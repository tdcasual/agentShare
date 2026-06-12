/**
 * Management session cookie name resolution for VaultGate.
 */

const DEFAULT_COOKIE_NAME = 'user_id';

export function resolveManagementSessionCookieName(): string {
  // VaultGate uses the cookie name from settings; in middleware we use the default
  return process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? DEFAULT_COOKIE_NAME;
}
