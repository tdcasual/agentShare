import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('reviews and approvals', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays reviews page', async ({ page }) => {
    await page.goto('/reviews');
    await expect(page.getByRole('heading', { name: '审核' })).toBeVisible();
  });

  test('displays approvals page', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: '审批' })).toBeVisible();
  });
});
