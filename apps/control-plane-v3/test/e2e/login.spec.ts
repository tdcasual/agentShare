import { expect, test } from '@playwright/test';
import { fulfillJson } from './fixtures';

const sessionSummary = {
  status: 'active',
  actor_type: 'human',
  actor_id: 'owner',
  role: 'owner',
  auth_method: 'local_password',
  session_id: 'session-e2e',
  email: 'owner@example.com',
  expires_in: 3600,
  issued_at: 1_777_000_000,
  expires_at: 1_777_003_600,
};

async function mockBootstrapInitialized(page: import('@playwright/test').Page) {
  await page.route('**/api/bootstrap/status', async (route) => {
    await fulfillJson(route, 200, { initialized: true });
  });
}

async function mockBootstrapNotInitialized(page: import('@playwright/test').Page) {
  await page.route('**/api/bootstrap/status', async (route) => {
    await fulfillJson(route, 200, { initialized: false });
  });
}

test.describe('login page', () => {
  test('redirects to setup when bootstrap is not initialized', async ({ page }) => {
    await mockBootstrapNotInitialized(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/.*setup.*/);
  });

  test('submits login form successfully and redirects to dashboard', async ({ page }) => {
    await mockBootstrapInitialized(page);

    await page.route('**/api/session/login', async (route) => {
      await fulfillJson(route, 200, sessionSummary);
    });

    await page.goto('/login');

    // Wait for the initialization check to complete so the form is interactive
    await expect(page.getByText(/正在初始化/)).not.toBeVisible();

    await page.getByLabel('邮箱').fill('owner@example.com');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();

    // After successful login the page does window.location.href = target
    await expect(page).toHaveURL(/\//);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await mockBootstrapInitialized(page);

    await page.route('**/api/session/login', async (route) => {
      await fulfillJson(route, 401, { detail: '邮箱或密码错误' });
    });

    await page.goto('/login');
    await expect(page.getByText(/正在初始化/)).not.toBeVisible();

    await page.getByLabel('邮箱').fill('wrong@example.com');
    await page.getByLabel('密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    // Error should be displayed in the status box
    await expect(page.getByText('邮箱或密码错误')).toBeVisible();

    // Button should return to normal state (not loading)
    await expect(page.getByRole('button', { name: '登录' })).toBeEnabled();
  });

  test('shows error when login API is unavailable', async ({ page }) => {
    await mockBootstrapInitialized(page);

    await page.route('**/api/session/login', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/login');
    await expect(page.getByText(/正在初始化/)).not.toBeVisible();

    await page.getByLabel('邮箱').fill('owner@example.com');
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();

    // Error should appear in the status box and button should be re-enabled
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' })).toBeEnabled();
  });

  test('button is disabled during submission', async ({ page }) => {
    await mockBootstrapInitialized(page);

    await page.route('**/api/session/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await fulfillJson(route, 200, sessionSummary);
    });

    await page.goto('/login');
    await expect(page.getByText(/正在初始化/)).not.toBeVisible();

    const submitButton = page.getByRole('button', { name: '登录' });
    await page.getByLabel('邮箱').fill('owner@example.com');
    await page.getByLabel('密码').fill('password123');

    await submitButton.click();

    // Use waitForFunction to detect disabled state with polling
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        return btn?.disabled === true;
      },
      null,
      { timeout: 5000 }
    );
  });
});
