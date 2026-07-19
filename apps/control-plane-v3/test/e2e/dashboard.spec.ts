import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page);
  });

  test('displays dashboard heading', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /安全控制台|Security control plane/ })
    ).toBeVisible();
  });

  test('navigates to secrets page', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /密钥|Secrets/ })
      .first()
      .click();
    await expect(page).toHaveURL(/.*secrets.*/);
  });

  test('navigates to Agents page', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /Agent|Agents/ })
      .first()
      .click();
    await expect(page).toHaveURL(/.*agents.*/);
  });

  test('navigates to audit page', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /审计|Audit/ })
      .first()
      .click();
    await expect(page).toHaveURL(/.*audit.*/);
  });
});
