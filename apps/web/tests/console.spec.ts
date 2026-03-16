import { expect, test } from "@playwright/test";

test("homepage links to secrets and tasks", async ({ page }) => {
  await page.goto("/");

  const nav = page.getByLabel("Primary");

  await expect(nav.getByRole("link", { name: "Secrets", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Tasks", exact: true })).toBeVisible();
});
