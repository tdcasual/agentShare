import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const MANAGEMENT_SESSION_COOKIE = "management_session";

export async function getManagementSessionToken() {
  const store = await cookies();
  return store.get(MANAGEMENT_SESSION_COOKIE)?.value ?? "";
}

export async function hasManagementSession() {
  return Boolean(await getManagementSessionToken());
}

export async function requireManagementSession(nextPath: string) {
  if (!(await hasManagementSession())) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
}

export async function getManagementSessionHeaders(): Promise<Record<string, string>> {
  const token = await getManagementSessionToken();
  if (!token) {
    return {};
  }
  return { Cookie: `${MANAGEMENT_SESSION_COOKIE}=${token}` };
}

export async function persistManagementSessionCookie(setCookieHeader: string) {
  const tokenMatch = setCookieHeader.match(/management_session=([^;]+)/i);
  if (!tokenMatch) {
    throw new Error("Management session cookie missing from API response.");
  }

  const maxAgeMatch = setCookieHeader.match(/Max-Age=(\d+)/i);
  const store = await cookies();
  store.set(MANAGEMENT_SESSION_COOKIE, tokenMatch[1], {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMatch ? Number.parseInt(maxAgeMatch[1], 10) : undefined,
  });
}

export async function clearManagementSessionCookie() {
  const store = await cookies();
  store.delete(MANAGEMENT_SESSION_COOKIE);
}
