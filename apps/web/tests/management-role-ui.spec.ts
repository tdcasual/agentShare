import { expect, test } from "@playwright/test";

import { useManagementRole } from "./helpers";

test("viewer session keeps approvals in read-only locked mode", async ({ page }) => {
  await useManagementRole(page, "viewer");
  await page.goto("/approvals");

  await expect(page.locator(".shell-meta .shell-pill")).toContainText("Viewer session active");
  await expect(page.getByRole("heading", { name: "An operator role is required to review approvals." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByText("Required role: Operator")).toBeVisible();
});

test("operator session hides admin-only secret, capability, and agent setup", async ({ page }) => {
  await useManagementRole(page, "operator");

  await page.goto("/secrets");
  await expect(page.locator(".shell-meta .shell-pill")).toContainText("Operator session active");
  await expect(page.getByRole("heading", { name: "An admin role is required to manage secret inventory." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save secret" })).toHaveCount(0);

  await page.goto("/capabilities");
  await expect(page.getByRole("heading", { name: "An admin role is required to configure capability bindings." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create capability" })).toHaveCount(0);

  await page.goto("/agents");
  await expect(page.getByRole("heading", { name: "An admin role is required to manage agent inventory." })).toBeVisible();
  await expect(page.getByText("Register new agent")).toHaveCount(0);
});

test("admin session still exposes admin management forms", async ({ page }) => {
  await useManagementRole(page, "admin");

  await page.goto("/secrets");
  await expect(page.locator(".shell-meta .shell-pill")).toContainText("Admin session active");
  await expect(page.getByRole("button", { name: "Save secret" })).toBeVisible();

  await page.goto("/agents");
  await expect(page.getByText("Register new agent")).toBeVisible();
  await page.getByText("Register new agent").click();
  await expect(page.getByRole("button", { name: "Create agent" })).toBeVisible();
});

test("owner session can delete an agent from the inventory", async ({ page }) => {
  const suffix = Date.now().toString();
  const agentName = `Owner managed agent ${suffix}`;

  await useManagementRole(page, "owner");
  await page.goto("/agents");
  await page.getByText("Register new agent").click();
  await page.getByLabel("Name").fill(agentName);
  await page.getByRole("button", { name: "Create agent" }).click();

  const agentCard = page.getByTestId("agent-card").filter({ hasText: agentName });
  await expect(agentCard).toBeVisible();
  await agentCard.getByRole("button", { name: "Delete agent" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Agent deleted:" })).toContainText(agentName);
  await expect(page.getByTestId("agent-card").filter({ hasText: agentName })).toHaveCount(0);
});
