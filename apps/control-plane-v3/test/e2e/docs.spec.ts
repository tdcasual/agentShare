import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('documentation', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'admin');
  });

  test('displays docs page', async ({ page }) => {
    await page.goto('/docs');
    await expect(page.getByRole('heading', { name: '文档' })).toBeVisible();
  });
});
