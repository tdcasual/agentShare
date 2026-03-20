import { expect, Page } from "@playwright/test";

export async function loginToManagementConsole(page: Page, nextPath = "/secrets") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page.getByLabel("Bootstrap management credential").fill("changeme-bootstrap-key");
  await page.getByRole("button", { name: "Create management session" }).click();
  await expect(page).toHaveURL(new RegExp(`${nextPath.replace("/", "\\/")}$`));
}
