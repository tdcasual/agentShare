import { expect, test } from "@playwright/test";

test("user can create a secret and publish a task", async ({ page }) => {
  await page.goto("/secrets");

  await page.getByLabel("Display name").fill("Playwright secret");
  await page.getByLabel("Kind").selectOption("api_token");
  await page.getByLabel("Secret value").fill("pw-secret");
  await page.getByLabel("Scope").fill('{"provider":"playwright"}');
  await page.getByRole("button", { name: "Save secret" }).click();

  await expect(page.getByRole("status")).toContainText("Playwright secret");
  await expect(
    page.getByRole("listitem").filter({ hasText: "Playwright secret" }),
  ).toBeVisible();

  await page.goto("/tasks");

  await page.getByLabel("Title").fill("Playwright task");
  await page.getByLabel("Task type").fill("smoke_task");
  await page.getByLabel("Input").fill('{"provider":"playwright"}');
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByRole("status")).toContainText("Playwright task");
  await expect(page.getByRole("row").filter({ hasText: "Playwright task" })).toBeVisible();
});
