import { expect, test } from "@playwright/test";

test("homepage links to secrets and tasks", async ({ page }) => {
  await page.goto("/");

  const nav = page.getByLabel("Primary");

  await expect(nav.getByRole("link", { name: "Secrets", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agent quickstart" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Swagger UI" })).toBeVisible();
  await expect(page.getByRole("link", { name: "OpenAPI JSON" })).toBeVisible();
});

test("secrets page shows live API connection state when backend is configured", async ({ page }) => {
  await page.goto("/secrets");

  await expect(
    page.getByRole("status").filter({ hasText: "live API connected for secrets." }),
  ).toContainText("live");
});
