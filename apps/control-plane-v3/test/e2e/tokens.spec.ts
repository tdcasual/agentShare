import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('tokens management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'admin');
  });

  test('displays tokens page', async ({ page }) => {
    await page.goto('/tokens');
    await expect(page.getByRole('heading', { name: /访问Token|Access Tokens/ })).toBeVisible();
  });

  test('displays token list', async ({ page }) => {
    await page.goto('/tokens');
    await expect(page.getByText('CI/CD Token')).toBeVisible();
  });
});
