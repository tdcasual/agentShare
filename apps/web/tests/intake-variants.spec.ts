import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { loginToManagementConsole } from "./helpers";

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3800";

async function getCatalogVariantIds(
  page: Page,
  request: APIRequestContext,
  kind: string,
) {
  const cookies = await page.context().cookies(API_BASE_URL);
  const managementSession = cookies.find((cookie) => cookie.name === "management_session");
  expect(managementSession, "management session cookie should be available").toBeTruthy();

  const response = await request.get(`${API_BASE_URL}/api/intake-catalog`, {
    headers: {
      Cookie: `management_session=${managementSession?.value ?? ""}`,
    },
  });
  expect(response.ok()).toBeTruthy();

  const payload = await response.json() as {
    resource_kinds: Array<{
      kind: string;
      variants: Array<{ variant: string }>;
    }>;
  };
  const resource = payload.resource_kinds.find((item) => item.kind === kind);
  return resource ? resource.variants.map((variant) => variant.variant) : [];
}

async function expectVariantPickerToMatchCatalog(
  page: Page,
  request: APIRequestContext,
  kind: string,
) {
  const apiVariants = await getCatalogVariantIds(page, request, kind);
  const uiVariants = await page.locator("[data-testid^='variant-option-']").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-testid")?.replace("variant-option-", "") ?? ""),
  );

  expect(uiVariants).toEqual(apiVariants);
}

test("intake variants update defaults and submit scoped agent policies", async ({ page, request }) => {
  const suffix = Date.now().toString();

  await loginToManagementConsole(page, "/secrets");

  await expect(page.getByTestId("intake-variant-picker")).toBeVisible();
  await expectVariantPickerToMatchCatalog(page, request, "secret");
  await page.getByTestId("variant-option-openai_api_token").click();
  await expect(page.getByLabel("Provider", { exact: true })).toHaveValue("openai");
  await expect(page.getByLabel("Kind")).toHaveValue("api_token");

  await page.getByLabel("Display name").fill(`OpenAI variant secret ${suffix}`);
  await page.getByLabel("Secret value").fill("sk-variant");
  await page.getByRole("button", { name: "Save secret" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Secret saved:" }),
  ).toContainText(`OpenAI variant secret ${suffix}`);

  await page.goto("/tasks");

  await expectVariantPickerToMatchCatalog(page, request, "task");
  await page.getByTestId("variant-option-prompt_run").click();
  await expect(page.getByLabel("Task type")).toHaveValue("prompt_run");
  await expect(page.getByLabel("Input")).toHaveValue('{"provider":"openai"}');

  await page.getByLabel("Title").fill(`Prompt variant task ${suffix}`);
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Task published:" }),
  ).toContainText(`Prompt variant task ${suffix}`);

  await page.goto("/agents");
  await page.locator("summary").filter({ hasText: "Register new agent" }).click();

  await expectVariantPickerToMatchCatalog(page, request, "agent");
  await page.getByTestId("variant-option-task_scoped").click();
  await expect(page.getByLabel("Allowed task types")).toBeVisible();
  await expect(page.getByLabel("Allowed capability IDs")).toBeHidden();

  await page.getByLabel("Name").fill(`scoped-agent-${suffix}`);
  await page.getByLabel("Allowed task types").fill("prompt_run,account_read");
  await page.getByRole("button", { name: "Create agent" }).click();

  await expect(page.getByRole("heading", { name: "New Agent API Key" })).toBeVisible();

  const apiKey = (await page.locator(".key-value").textContent())?.trim();
  expect(apiKey).toBeTruthy();

  const meResponse = await request.get(`${API_BASE_URL}/api/agents/me`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  expect(meResponse.ok()).toBeTruthy();

  const payload = await meResponse.json();
  expect(payload.allowed_task_types).toEqual(["prompt_run", "account_read"]);
  expect(payload.allowed_capability_ids).toEqual([]);
});
