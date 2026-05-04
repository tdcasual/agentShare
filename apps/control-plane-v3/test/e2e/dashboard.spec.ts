import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays stat cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await expect(page.getByText('活跃操作员')).toBeVisible();
    await expect(page.getByText('已注册智能体').first()).toBeVisible();
    await expect(page.getByText('活跃令牌')).toBeVisible();
    await expect(page.getByText('待处理项目')).toBeVisible();
  });

  test('navigates to identities page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.getByRole('navigation').getByRole('link', { name: '身份' }).click();
    await expect(page).toHaveURL(/.*identities.*/);
  });

  test('navigates to tasks page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.getByRole('navigation').getByRole('link', { name: '任务' }).click();
    await expect(page).toHaveURL(/.*tasks.*/);
  });

  test('navigates to assets page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.getByRole('navigation').getByRole('link', { name: '资产' }).click();
    await expect(page).toHaveURL(/.*assets.*/);
  });

  test('navigates to marketplace page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.getByRole('navigation').getByRole('link', { name: '市场' }).click();
    await expect(page).toHaveURL(/.*marketplace.*/);
  });
});
