import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const MANAGEMENT_SESSION_COOKIE = "management_session";

type ManagementSessionState = {
  active: boolean;
  error: "missing" | "session-expired" | "api-unavailable" | null;
  authMethod?: string;
  actorId?: string;
  expiresAt?: number;
};

function getManagementApiBaseUrl() {
  return process.env.AGENT_CONTROL_PLANE_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
}

export async function getManagementSessionToken() {
  const store = await cookies();
  return store.get(MANAGEMENT_SESSION_COOKIE)?.value ?? "";
}

export async function getManagementSessionState(): Promise<ManagementSessionState> {
  const token = await getManagementSessionToken();
  if (!token) {
    return {
      active: false,
      error: "missing",
    };
  }

  const apiBaseUrl = getManagementApiBaseUrl();
  if (!apiBaseUrl) {
    return {
      active: true,
      error: "api-unavailable",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/session/me`, {
      cache: "no-store",
      headers: {
        Cookie: `${MANAGEMENT_SESSION_COOKIE}=${token}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        active: false,
        error: "session-expired",
      };
    }

    if (!response.ok) {
      return {
        active: true,
        error: "api-unavailable",
      };
    }

    const payload = (await response.json()) as {
      actor_id?: string;
      auth_method?: string;
      expires_at?: number;
    };

    return {
      active: true,
      error: null,
      actorId: payload.actor_id,
      authMethod: payload.auth_method,
      expiresAt: payload.expires_at,
    };
  } catch {
    return {
      active: true,
      error: "api-unavailable",
    };
  }
}

export async function hasManagementSession() {
  const session = await getManagementSessionState();
  return session.active;
}

export async function requireManagementSession(nextPath: string) {
  const session = await getManagementSessionState();
  if (!session.active) {
    const suffix = session.error === "session-expired"
      ? `&error=session-expired`
      : "";
    redirect(`/login?next=${encodeURIComponent(nextPath)}${suffix}`);
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
