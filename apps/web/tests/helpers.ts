import { expect, Page } from "@playwright/test";

export async function setChineseLocale(page: Page) {
  await page.context().addCookies([
    {
      name: "acp_lang",
      value: "zh",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

export async function loginToManagementConsole(page: Page, nextPath = "/secrets") {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`);
  await page
    .getByLabel(/Bootstrap management credential|管理引导口令/)
    .fill("changeme-bootstrap-key");
  await page
    .getByRole("button", { name: /Create management session|创建管理会话/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`${nextPath.replace("/", "\\/")}$`));
}
