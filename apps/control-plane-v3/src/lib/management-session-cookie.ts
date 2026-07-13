/**
 * Management session cookie name resolution for VaultGate.
 *
 * Uses an opaque cookie name to avoid leaking semantic information.
 * The name is resolved from a server-only env var when available,
 * falling back to the VaultGate default.
 */

const DEFAULT_COOKIE_NAME = 'vaultgate_session';

export function resolveManagementSessionCookieName(): string {
  // Prefer the server-side-only var; fall back to the public var for
  // backwards compatibility, then to the opaque default.
  return (
    process.env.SESSION_COOKIE_NAME ??
    process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ??
    DEFAULT_COOKIE_NAME
  );
}
