import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('runs observability', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays runs page', async ({ page }) => {
    await page.goto('/runs');
    await expect(page.getByRole('heading', { name: '运行观测' })).toBeVisible();
  });

  test('displays run list', async ({ page }) => {
    await page.goto('/runs');
    await expect(page.getByText('运行 #run-1')).toBeVisible();
  });
});
