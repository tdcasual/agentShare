import { expect, test } from "@playwright/test";

import { loginToManagementConsole } from "./helpers";

test("intake forms show payload preview and let operators reuse saved templates", async ({ page }) => {
  const suffix = Date.now().toString();

  await loginToManagementConsole(page, "/secrets");

  await page.getByTestId("variant-option-openai_api_token").click();
  await page.getByLabel("Display name").fill(`Preview secret ${suffix}`);
  await page.getByLabel("Secret value").fill("sk-preview");
  await page.getByLabel("Environment").fill("staging");

  const preview = page.getByTestId("intake-payload-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('"provider": "openai"');
  await expect(preview).toContainText('"environment": "staging"');
  await expect(preview).not.toContainText('"metadata"');

  await page.getByRole("button", { name: "Save template" }).click();

  await page.getByLabel("Display name").fill(`Changed secret ${suffix}`);
  await expect(preview).toContainText(`Changed secret ${suffix}`);

  await page.getByRole("button", { name: "Use saved template" }).click();
  await expect(page.getByLabel("Display name")).toHaveValue(`Preview secret ${suffix}`);
  await expect(preview).toContainText(`Preview secret ${suffix}`);

  await page.locator("summary").filter({ hasText: "Advanced settings" }).click();
  await page.getByLabel("Metadata (JSON)").fill('{"owner":"platform","mode":"manual"}');
  await expect(preview).toContainText('"metadata": "{\\"owner\\":\\"platform\\",\\"mode\\":\\"manual\\"}"');
});
