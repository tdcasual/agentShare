import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('tokens management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays tokens page', async ({ page }) => {
    await page.goto('/tokens');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: '远程访问令牌' })).toBeVisible();
  });

  test('displays token list', async ({ page }) => {
    await page.goto('/tokens');
    await expect(page.getByText('Primary Token')).toBeVisible();
  });
});
