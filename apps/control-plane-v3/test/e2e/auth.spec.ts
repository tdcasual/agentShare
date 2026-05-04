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

  test('shows dashboard for authenticated viewer', async ({ page }) => {
    await mockSession(page, 'viewer');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /欢迎/ })).toBeVisible();
  });

  test('logout page shows signing out', async ({ page }) => {
    await mockSession(page, 'owner');
    await page.goto('/logout');
    await expect(page.getByText(/正在退出/)).toBeVisible();
  });
});
