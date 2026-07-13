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
    await mockSession(page, 'admin');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /欢迎|VaultGate/ })).toBeVisible();
  });

  test('logout sends POST to session logout endpoint', async ({ page }) => {
    await mockSession(page, 'admin');
    const logoutRequest = page.waitForRequest(
      (req) => req.url().includes('/api/session/logout') && req.method() === 'POST'
    );
    await page.goto('/logout');
    await logoutRequest;
  });
});
