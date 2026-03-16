import { expect, test } from "@playwright/test";

test("user can bind a secret into a capability", async ({ page }) => {
  await page.goto("/secrets");

  await page.getByLabel("Display name").fill("Capability secret");
  await page.getByLabel("Kind").selectOption("api_token");
  await page.getByLabel("Secret value").fill("cap-secret");
  await page.getByLabel("Scope").fill('{"provider":"github"}');
  await page.getByRole("button", { name: "Save secret" }).click();

  await expect(page.getByRole("status")).toContainText("Capability secret");

  await page.goto("/capabilities");

  await page.getByLabel("Capability name").fill("github.repo.sync");
  await page.getByLabel("Bound secret").selectOption({ label: "Capability secret" });
  await page.getByLabel("Allowed mode").selectOption("proxy_or_lease");
  await page.getByLabel("Risk level").selectOption("medium");
  await page.getByLabel("Lease TTL").fill("180");
  await page.getByRole("button", { name: "Create capability" }).click();

  await expect(page.getByRole("status")).toContainText("github.repo.sync");
  await expect(page.getByRole("listitem").filter({ hasText: "github.repo.sync" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Capability secret" })).toBeVisible();
});
