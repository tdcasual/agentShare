type ManagementSessionCookieEnv = {
  MANAGEMENT_SESSION_COOKIE_NAME?: string;
  NEXT_PUBLIC_MANAGEMENT_SESSION_COOKIE_NAME?: string;
};

export function resolveManagementSessionCookieName(
  env: ManagementSessionCookieEnv = process.env as ManagementSessionCookieEnv
): string {
  return (
    env.MANAGEMENT_SESSION_COOKIE_NAME ||
    env.NEXT_PUBLIC_MANAGEMENT_SESSION_COOKIE_NAME ||
    'management_session'
  );
}
