import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('tasks management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays task list', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: '任务编排' })).toBeVisible();
    await expect(page.getByText('Test Task')).toBeVisible();
  });

  test('opens task creation dialog', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('button', { name: '发布任务' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  });
});
