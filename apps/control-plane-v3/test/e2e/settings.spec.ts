import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  });
});
