import { expect, test } from '@playwright/test';
import { mockSession, mockUnauthenticated, mockSetupRequired } from './fixtures';

test.describe('authentication flow', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto('/');
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('shows setup page when bootstrap is not initialized', async ({ page }) => {
    await mockSetupRequired(page);
    await page.goto('/');
    await expect(page).toHaveURL(/.*setup.*/);
  });

  test('shows dashboard for authenticated admin', async ({ page }) => {
    await mockSession(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /安全控制台|Security control plane/ })
    ).toBeVisible();
  });

  test('logout sends DELETE to session endpoint', async ({ page }) => {
    await mockSession(page);
    const logoutRequest = page.waitForRequest(
      (req) => req.url().includes('/api/admin/session') && req.method() === 'DELETE'
    );
    await page.goto('/logout');
    await logoutRequest;
  });
});
