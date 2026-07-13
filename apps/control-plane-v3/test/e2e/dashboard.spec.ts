import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'admin');
  });

  test('displays dashboard heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /欢迎|VaultGate/ })).toBeVisible();
  });

  test('navigates to secrets page', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /密钥|Secrets/ })
      .first()
      .click();
    await expect(page).toHaveURL(/.*secrets.*/);
  });

  test('navigates to tokens page', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /令牌|Tokens/ })
      .first()
      .click();
    await expect(page).toHaveURL(/.*tokens.*/);
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
