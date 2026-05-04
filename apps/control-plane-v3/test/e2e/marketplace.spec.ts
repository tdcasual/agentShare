import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays marketplace page', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.getByText('智能体市场')).toBeVisible();
  });

  test('displays catalog sections', async ({ page }) => {
    await page.goto('/marketplace');
    await page.waitForTimeout(2000);
    await expect(page.getByText('等待人工审核').first()).toBeVisible();
    await expect(page.getByText('由智能体发布')).toBeVisible();
  });
});
