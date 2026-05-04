import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('identities management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays identity list', async ({ page }) => {
    await page.goto('/identities');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('heading', { name: '身份管理' })).toBeVisible();
    await expect(page.getByText('Test Agent').first()).toBeVisible();
  });

  test('filters by search query', async ({ page }) => {
    await page.goto('/identities');
    await page.waitForTimeout(2000);
    const searchInput = page.getByPlaceholder(/搜索身份/);
    await searchInput.fill('Test');
    await page.waitForTimeout(500);
    await expect(page.getByRole('link', { name: 'Test Agent' }).first()).toBeVisible();
  });

  test('navigates to agent detail page', async ({ page }) => {
    await page.goto('/identities');
    await page.waitForTimeout(2000);
    await page.getByRole('link', { name: 'Test Agent' }).first().click();
    await expect(page).toHaveURL(/.*identities\/agent-1.*/);
    await expect(page.getByRole('heading', { name: 'Test Agent' })).toBeVisible();
  });
});
