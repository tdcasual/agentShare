import { expect, test } from "@playwright/test";

import { loginToManagementConsole } from "./helpers";

test("user can create a secret and publish a task", async ({ page }) => {
  await loginToManagementConsole(page, "/secrets");

  await page.getByLabel("Display name").fill("Playwright secret");
  await page.getByLabel("Kind").selectOption("api_token");
  await page.getByLabel("Secret value").fill("pw-secret");
  await page.getByLabel("Provider", { exact: true }).fill("playwright");
  await page.getByLabel("Environment").fill("staging");
  await page.getByLabel("Provider scopes").fill("config.read,config.write");
  await page.getByLabel("Resource selector").fill("workspace:test");
  await page.getByRole("button", { name: "Save secret" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Secret saved:" }),
  ).toContainText("Playwright secret");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Playwright secret" }),
  ).toBeVisible();

  await page.goto("/tasks");

  await page.getByLabel("Title").fill("Playwright task");
  await page.getByLabel("Task type").fill("smoke_task");
  await page.getByLabel("Input").fill('{"provider":"playwright"}');
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Task published:" }),
  ).toContainText("Playwright task");
  await expect(page.getByRole("row").filter({ hasText: "Playwright task" })).toBeVisible();
});
