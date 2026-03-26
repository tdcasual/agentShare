import { expect, test } from "@playwright/test";

import { setChineseLocale } from "./helpers";

test("shell brand is product-only without slogan copy", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/");

  await expect(page.getByText("Agent 控制平面", { exact: true })).toBeVisible();
  await expect(page.getByText("人类与 Agent 协作运营")).toHaveCount(0);
});

test("quickstart tools rail stays compact on desktop", async ({ page }) => {
  await setChineseLocale(page);
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/quickstart");

  const docsButton = page.getByRole("link", { name: "API 文档" });
  await expect(docsButton).toBeVisible();
  await expect(docsButton).toHaveJSProperty("offsetHeight", 53);
});

test("mobile quickstart has no page-level horizontal overflow", async ({ page }) => {
  await setChineseLocale(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/quickstart");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
});

test("shell topbar contains product name and state pill without secondary slogan block", async ({
  page,
}) => {
  await setChineseLocale(page);
  await page.goto("/");

  await expect(page.locator(".brand-copy strong")).toHaveText("Agent 控制平面");
  await expect(page.locator(".brand-copy span")).toHaveCount(0);
  await expect(page.locator(".shell-meta .shell-pill")).toContainText("登录前仅可读");
});

test("primary pages keep one main title and avoid stacked duplicate framing", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/tasks");

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".notice")).toHaveCount(1);
});

test("homepage surfaces next actions before explanation blocks", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/");

  await expect(page.getByRole("link", { name: "打开任务队列" })).toBeVisible();
  await expect(page.getByRole("link", { name: "浏览手册" })).toBeVisible();
  await expect(page.getByText("平台姿态")).toBeVisible();
});

test("quickstart keeps tools rail compact and code blocks scroll safely", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/quickstart");

  const codeBlocks = page.locator(".code-block");
  await expect(codeBlocks.first()).toBeVisible();
  await expect(page.getByRole("link", { name: "API 文档" })).toBeVisible();
});

test("task and approval cards show concise operational metadata", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/tasks");

  await expect(page.getByText("任务队列")).toBeVisible();
  await expect(page.getByText("待认领")).toBeVisible();
  await expect(page.getByText("可申请租约")).toHaveCount(0);
});

test("management pages use Chinese-first labels without noisy mixed terminology", async ({
  page,
}) => {
  await setChineseLocale(page);
  await page.goto("/login");

  await expect(page.getByLabel("管理引导口令")).toBeVisible();
  await expect(page.getByText("Bootstrap 管理凭据")).toHaveCount(0);
});

test("mobile homepage uses compact nav trigger and full-width primary actions", async ({
  page,
}) => {
  await setChineseLocale(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByText("展开导航")).toBeVisible();
  await expect(page.getByRole("link", { name: "打开任务队列" })).toBeVisible();
});
