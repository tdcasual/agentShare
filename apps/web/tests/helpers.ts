import { createHmac } from "crypto";

import { expect, Page } from "@playwright/test";

type ManagementRole = "viewer" | "operator" | "admin" | "owner";

const MANAGEMENT_SESSION_SECRET = "changeme-management-session-secret";

function encodeComponent(raw: string | Buffer) {
  return Buffer.from(raw).toString("base64url");
}

function buildManagementSessionToken(role: ManagementRole, actorId = `ops.${role}`) {
  const issuedAt = Math.floor(Date.now() / 1000) - 5;
  const payload = {
    sub: actorId,
    actor_id: actorId,
    actor_type: "human",
    role,
    auth_method: "session",
    session_id: `session-${role}-${Date.now()}`,
    iat: issuedAt,
    exp: issuedAt + 60 * 60,
    ver: 1,
  };
  const encodedPayload = encodeComponent(JSON.stringify(payload));
  const signature = createHmac("sha256", MANAGEMENT_SESSION_SECRET)
    .update(encodedPayload)
    .digest();
  return `${encodedPayload}.${encodeComponent(signature)}`;
}

export async function setChineseLocale(page: Page) {
  await page.context().addCookies([
    {
      name: "acp_lang",
      value: "zh",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function loginToManagementConsole(page: Page, nextPath = "/secrets") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page
    .getByLabel(/Bootstrap management credential|管理引导口令/)
    .fill("changeme-bootstrap-key");
  await page
    .getByRole("button", { name: /Create management session|创建管理会话/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`${nextPath.replace("/", "\\/")}$`));
}

export async function useManagementRole(page: Page, role: ManagementRole) {
  await page.context().addCookies([
    {
      name: "management_session",
      value: buildManagementSessionToken(role),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}
