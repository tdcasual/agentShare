import { expect, test } from "@playwright/test";

import { loginToManagementConsole } from "./helpers";

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3800";

test("intake variants update defaults and submit scoped agent policies", async ({ page, request }) => {
  const suffix = Date.now().toString();

  await loginToManagementConsole(page, "/secrets");

  await expect(page.getByTestId("intake-variant-picker")).toBeVisible();
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
