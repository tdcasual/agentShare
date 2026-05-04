import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('inbox', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays inbox page', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.getByRole('heading', { name: /收件箱/ })).toBeVisible();
  });

  test('displays event feed', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.getByText('Agent completed a task')).toBeVisible();
  });
});
