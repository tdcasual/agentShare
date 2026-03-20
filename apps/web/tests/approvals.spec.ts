import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { loginToManagementConsole } from "./helpers";

const API_BASE_URL = "http://127.0.0.1:8000";

async function createSecret(page: Page, name: string) {
  await page.goto("/secrets");
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Kind").selectOption("api_token");
  await page.getByLabel("Secret value").fill(`token-${name}`);
  await page.getByLabel("Provider", { exact: true }).fill("openai");
  await page.getByLabel("Environment").fill("staging");
  await page.getByLabel("Provider scopes").fill("responses.read");
  await page.getByRole("button", { name: "Save secret" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Secret saved:" })).toContainText(name);
}

async function getManagementCookie(page: Page) {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === "management_session");
  if (!sessionCookie) {
    throw new Error("Management session cookie not found");
  }
  return `${sessionCookie.name}=${sessionCookie.value}`;
}

async function createAgent(request: APIRequestContext, page: Page, name: string) {
  const cookie = await getManagementCookie(page);
  const response = await request.post(`${API_BASE_URL}/api/agents`, {
    headers: {
      Cookie: cookie,
    },
    data: {
      name,
      risk_tier: "medium",
    },
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string; api_key: string }>;
}

async function managementPost(
  request: APIRequestContext,
  page: Page,
  path: string,
  data: Record<string, unknown>,
) {
  const cookie = await getManagementCookie(page);
  const response = await request.post(`${API_BASE_URL}${path}`, {
    headers: {
      Cookie: cookie,
    },
    data,
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<Record<string, unknown>>;
}

async function triggerBlockedInvoke(
  request: APIRequestContext,
  agentKey: string,
  taskId: string,
  capabilityId: string,
) {
  const claimResponse = await request.post(`${API_BASE_URL}/api/tasks/${taskId}/claim`, {
    headers: {
      Authorization: `Bearer ${agentKey}`,
    },
  });
  expect(claimResponse.ok()).toBeTruthy();

  return request.post(`${API_BASE_URL}/api/capabilities/${capabilityId}/invoke`, {
    headers: {
      Authorization: `Bearer ${agentKey}`,
    },
    data: {
      task_id: taskId,
      parameters: {
        prompt: "hello from playwright",
      },
    },
  });
}

test("operator can approve a pending manual capability request", async ({ page, request }) => {
  const suffix = Date.now().toString();
  const secretName = `Approval secret ${suffix}`;
  const capabilityName = `openai.chat.manual.${suffix}`;
  const taskTitle = `Approval task ${suffix}`;

  await loginToManagementConsole(page, "/approvals");

  const secret = await managementPost(request, page, "/api/secrets", {
    display_name: secretName,
    kind: "api_token",
    value: `token-${suffix}`,
    provider: "openai",
    environment: "staging",
    provider_scopes: ["responses.read"],
    resource_selector: "workspace:playwright",
    metadata: {},
  });
  const capability = await managementPost(request, page, "/api/capabilities", {
    name: capabilityName,
    secret_id: secret.id,
    allowed_mode: "proxy_only",
    risk_level: "medium",
    approval_mode: "manual",
    required_provider: "openai",
    required_provider_scopes: ["responses.read"],
    allowed_environments: ["staging"],
    lease_ttl_seconds: 180,
    adapter_type: "generic_http",
    adapter_config: { url: `${API_BASE_URL}/healthz`, method: "GET" },
  });
  const task = await managementPost(request, page, "/api/tasks", {
    title: taskTitle,
    task_type: "prompt_run",
    input: { provider: "openai" },
    required_capability_ids: [capability.id],
    lease_allowed: false,
    approval_mode: "auto",
  });

  const agent = await createAgent(request, page, `approval-agent-${suffix}`);
  const invokeResponse = await triggerBlockedInvoke(
    request,
    agent.api_key,
    String(task.id),
    String(capability.id),
  );

  expect(invokeResponse.status()).toBe(409);
  const invokePayload = await invokeResponse.json();
  const approvalRequestId = invokePayload.detail.approval_request_id as string;

  await page.goto("/approvals");
  await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();
  const approvalRow = page.getByRole("row").filter({ hasText: approvalRequestId });
  await expect(approvalRow).toBeVisible();

  await approvalRow.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Approval updated:" })).toContainText(
    approvalRequestId,
  );
  await expect(page.getByText("No approval requests are waiting right now.")).toBeVisible();

  const approvedInvoke = await request.post(`${API_BASE_URL}/api/capabilities/${String(capability.id)}/invoke`, {
    headers: {
      Authorization: `Bearer ${agent.api_key}`,
    },
    data: {
      task_id: String(task.id),
      parameters: {
        prompt: "hello again",
      },
    },
  });
  expect(approvedInvoke.status()).toBe(200);
});

test("task and capability forms expose approval mode selectors", async ({ page }) => {
  const suffix = Date.now().toString();
  const secretName = `Selector secret ${suffix}`;

  await loginToManagementConsole(page, "/secrets");
  await createSecret(page, secretName);

  await page.goto("/capabilities");
  const capabilityApprovalMode = page.getByLabel("Approval mode");
  await expect(capabilityApprovalMode).toBeVisible();
  await expect(capabilityApprovalMode.locator("option")).toHaveText(["Auto", "Manual review"]);

  await page.goto("/tasks");
  const taskApprovalMode = page.getByLabel("Approval mode");
  await expect(taskApprovalMode).toBeVisible();
  await expect(taskApprovalMode.locator("option")).toHaveText(["Auto", "Manual review"]);
});
