import { expect, test } from "@playwright/test";

import { loginToManagementConsole, setChineseLocale } from "./helpers";

test("homepage uses Chinese-first navigation and action labels", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/");

  const nav = page.getByLabel("Primary");

  await expect(nav.getByRole("link", { name: "概览", exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "快速开始", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "打开任务队列" })).toBeVisible();
  await expect(page.getByRole("link", { name: "浏览手册" })).toBeVisible();
  await expect(page.getByText("控制平面", { exact: true })).toBeVisible();
});

test("quickstart in Chinese avoids mixed English guidance labels", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/quickstart");

  await expect(page.getByRole("heading", { name: "按顺序走完这六步标准路径。" })).toBeVisible();
  await expect(page.getByText("标准路径", { exact: true })).toHaveCount(6);
  await expect(page.getByText("Happy Path")).toHaveCount(0);
  await expect(page.getByText("Agent Key")).toHaveCount(0);
});

test("mobile homepage collapses navigation into a compact trigger", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setChineseLocale(page);
  await page.goto("/");

  await expect(page.getByText("展开导航", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Primary")).toBeHidden();
  await expect(page.getByRole("link", { name: "打开任务队列" })).toBeVisible();
});

test("agent self-serve groups work into connect, queue, playbooks, and execution sections", async ({ page }) => {
  await setChineseLocale(page);
  await page.goto("/agent");

  await expect(page.getByRole("heading", { name: "连接身份" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "任务队列" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "手册检索" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "执行动作" })).toBeVisible();
  await expect(page.getByText("当前任务")).toHaveCount(1);
});

test("management pages redirect to login when session is missing", async ({ page }) => {
  await page.goto("/secrets");
  await expect(page).toHaveURL(/\/login\?next=%2Fsecrets$/);
});

test("secrets page shows live API connection state when backend is configured", async ({ page }) => {
  await loginToManagementConsole(page, "/secrets");

  await expect(
    page.getByRole("status").filter({ hasText: "live API connected for secrets." }),
  ).toContainText("live");
});
