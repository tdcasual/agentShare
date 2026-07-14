import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('Agent management', () => {
  test.beforeEach(async ({ page }) => mockSession(page));

  test('lists Agents and opens the Agent detail', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.getByText('Deploy Agent')).toBeVisible();
    await page.getByText('Deploy Agent').click();
    await expect(page).toHaveURL(/agents\/agent-1/);
    await expect(page.getByText('CI/CD Token')).toBeVisible();
  });
});
