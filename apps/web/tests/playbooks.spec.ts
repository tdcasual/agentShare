import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { loginToManagementConsole } from "./helpers";

const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:3800";

async function getManagementCookie(page: Page) {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === "management_session");
  if (!sessionCookie) {
    throw new Error("Management session cookie not found");
  }
  return `${sessionCookie.name}=${sessionCookie.value}`;
}

async function createPlaybook(
  request: APIRequestContext,
  page: Page,
  payload: {
    title: string;
    task_type: string;
    body: string;
    tags: string[];
  },
) {
  const cookie = await getManagementCookie(page);
  const response = await request.post(`${API_BASE_URL}/api/playbooks`, {
    headers: {
      Cookie: cookie,
    },
    data: payload,
  });

  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string; title: string }>;
}

test("playbooks page supports filters and detail navigation", async ({ page, request }) => {
  const suffix = Date.now().toString();
  await loginToManagementConsole(page, "/playbooks");

  await createPlaybook(request, page, {
    title: `OpenAI prompt run ${suffix}`,
    task_type: "prompt_run",
    body: "Run the prompt capability and store summary output in run metadata.",
    tags: ["openai", "prompt"],
  });
  await createPlaybook(request, page, {
    title: `QQ config sync ${suffix}`,
    task_type: "config_sync",
    body: "Validate config capability, sync provider state, and verify outcome.",
    tags: ["qq", "config"],
  });

  await page.goto("/playbooks?q=prompt&tag=openai");

  await expect(page.getByText(`OpenAI prompt run ${suffix}`)).toBeVisible();
  await expect(page.getByText(`QQ config sync ${suffix}`)).not.toBeVisible();
  await expect(page.getByText("Showing 1 of 1 playbooks.")).toBeVisible();

  await page.getByRole("link", { name: `OpenAI prompt run ${suffix}` }).click();
  await expect(page).toHaveURL(/\/playbooks\/playbook-\d+$/);
  await expect(page.getByRole("heading", { name: `OpenAI prompt run ${suffix}` })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Instructions" })).toBeVisible();
});

test("tasks page can reference attached playbooks", async ({ page, request }) => {
  const suffix = Date.now().toString();
  await loginToManagementConsole(page, "/tasks");

  const playbook = await createPlaybook(request, page, {
    title: `Referenced playbook ${suffix}`,
    task_type: "config_sync",
    body: "Use this playbook to validate and sync provider state.",
    tags: ["qq"],
  });

  await page.getByLabel("Title").fill(`Task with playbook ${suffix}`);
  await page.getByLabel("Task type").fill("config_sync");
  await page.locator("summary").filter({ hasText: "Advanced settings" }).click();
  await page.getByLabel("Referenced playbooks").fill(playbook.id);
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Task published:" }),
  ).toContainText(`Task with playbook ${suffix}`);
  await expect(
    page.getByRole("link", { name: `Referenced playbook ${suffix}` }),
  ).toBeVisible();
});
