import { expect, test } from "@playwright/test";

import { loginToManagementConsole } from "./helpers";

test("user can bind a secret into a capability", async ({ page }) => {
  await loginToManagementConsole(page, "/secrets");

  await page.getByLabel("Display name").fill("Capability secret");
  await page.getByLabel("Kind").selectOption("api_token");
  await page.getByLabel("Secret value").fill("cap-secret");
  await page.getByLabel("Provider", { exact: true }).fill("github");
  await page.getByLabel("Environment").fill("production");
  await page.getByLabel("Provider scopes").fill("repo:read,repo:write");
  await page.getByLabel("Resource selector").fill("repo:agent-share");
  await page.getByRole("button", { name: "Save secret" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Secret saved:" }),
  ).toContainText("Capability secret");

  await page.goto("/capabilities");

  await page.getByLabel("Capability name").fill("github.repo.sync");
  await page.getByLabel("Bound secret").selectOption({ label: "Capability secret" });
  await page.getByLabel("Allowed mode").selectOption("proxy_or_lease");
  await page.getByLabel("Risk level").selectOption("medium");
  await page.getByLabel("Lease TTL").fill("180");
  await page.getByLabel("Required provider", { exact: true }).fill("github");
  await page.getByLabel("Required provider scopes").fill("repo:read");
  await page.getByLabel("Allowed environments").fill("production");
  await page.getByRole("button", { name: "Create capability" }).click();

  await expect(
    page.getByRole("status").filter({ hasText: "Capability created:" }),
  ).toContainText("github.repo.sync");
  await expect(page.getByRole("listitem").filter({ hasText: "github.repo.sync" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Capability secret" })).toBeVisible();
});
