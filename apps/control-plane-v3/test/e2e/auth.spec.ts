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

  test('shows dashboard for authenticated owner', async ({ page }) => {
    await mockSession(page, 'owner');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /欢迎/ })).toBeVisible();
  });

  test('shows forbidden for viewer accessing admin-only hub', async ({ page }) => {
    await mockSession(page, 'viewer');
    await page.goto('/');
    await expect(page.getByText(/访问受限/)).toBeVisible();
    await expect(page.getByText(/当前.*观察者/)).toBeVisible();
    await expect(page.getByText(/需要.*管理员/)).toBeVisible();
  });

  test('logout sends POST to session logout endpoint', async ({ page }) => {
    await mockSession(page, 'owner');
    const logoutRequest = page.waitForRequest(
      (req) => req.url().includes('/api/session/logout') && req.method() === 'POST'
    );
    await page.goto('/logout');
    await logoutRequest;
  });
});
