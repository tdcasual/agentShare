import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('playbooks', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays playbooks page', async ({ page }) => {
    await page.goto('/playbooks');
    await expect(page.getByRole('heading', { name: '手册' })).toBeVisible();
  });

  test('displays playbook list', async ({ page }) => {
    await page.goto('/playbooks');
    await page.waitForTimeout(2000);
    await expect(page.getByText('Test Playbook').first()).toBeVisible();
  });
});
