import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('spaces management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays spaces list', async ({ page }) => {
    await page.goto('/spaces');
    await expect(page.getByText('Test Space')).toBeVisible();
  });

  test('displays operations and governance panels', async ({ page }) => {
    await page.goto('/spaces');
    await expect(page.getByRole('heading', { name: '操作空间' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '治理空间' })).toBeVisible();
  });

  test('viewer sees limited panels', async ({ page }) => {
    await mockSession(page, 'viewer');
    await page.goto('/spaces');
    await expect(page.getByText('Test Space')).toBeVisible();
  });
});
