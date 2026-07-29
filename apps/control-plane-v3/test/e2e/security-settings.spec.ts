import { expect, test } from '@playwright/test';
import { fulfillJson } from './fixtures';

const email = 'admin@example.com';
const currentPassword = 'Curr3nt!Password2026';
const newPassword = 'N3w!Password#2026';

test.describe('Security settings', () => {
  test('changes the password, signs out, and accepts only the new password', async ({ page }) => {
    let authenticated = true;
    let activePassword = currentPassword;

    await page.route('**/api/admin/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (path === '/api/admin/bootstrap/status') {
        await fulfillJson(route, 200, { setup_required: false });
        return;
      }
      if (path === '/api/admin/session' && request.method() === 'GET') {
        await fulfillJson(
          route,
          authenticated ? 200 : 401,
          authenticated
            ? { id: 'admin', email, auth_type: 'session' }
            : { detail: 'Not authenticated' }
        );
        return;
      }
      if (path === '/api/admin/password' && request.method() === 'PATCH') {
        const body = request.postDataJSON() as {
          current_password: string;
          new_password: string;
        };
        if (body.current_password !== activePassword) {
          await fulfillJson(route, 400, { detail: 'Current password is incorrect' });
          return;
        }
        activePassword = body.new_password;
        authenticated = false;
        await route.fulfill({ status: 204 });
        return;
      }
      if (path === '/api/admin/session/login' && request.method() === 'POST') {
        const body = request.postDataJSON() as { email: string; password: string };
        if (body.email === email && body.password === activePassword) {
          authenticated = true;
          await fulfillJson(route, 200, { status: 'authenticated', email });
        } else {
          await fulfillJson(route, 401, { detail: 'Invalid email or password' });
        }
        return;
      }
      if (path === '/api/admin/audit-stats') {
        await fulfillJson(route, 200, { total: 0, granted: 0, denied: 0, value_reads: 0 });
        return;
      }
      await fulfillJson(route, 200, { items: [], total: 0 });
    });

    await page.goto('/settings/security');
    await expect(page.getByRole('heading', { name: '安全' })).toBeVisible();
    await page.getByLabel('当前密码').fill('Wr0ng!Password2026');
    await page.getByLabel('新密码', { exact: true }).fill(newPassword);
    await page.getByLabel('确认新密码').fill(newPassword);
    await page.getByRole('button', { name: '修改密码' }).click();
    await expect(page.getByText('当前密码不正确。')).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/security$/);

    await page.getByLabel('当前密码').fill(currentPassword);
    await page.getByRole('button', { name: '修改密码' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('密码已修改，请使用新密码重新登录。')).toBeVisible();

    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill(currentPassword);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page.getByText('登录失败，请检查凭据。')).toBeVisible();

    await page.getByLabel('密码').fill(newPassword);
    await page.getByRole('button', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: '安全控制台' })).toBeVisible();
  });

  test('exposes both settings destinations from the settings navigation', async ({ page }) => {
    await page.route('**/api/admin/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/admin/bootstrap/status') {
        await fulfillJson(route, 200, { setup_required: false });
      } else if (path === '/api/admin/session') {
        await fulfillJson(route, 200, {
          id: 'admin',
          email,
          auth_type: 'session',
        });
      } else {
        await fulfillJson(route, 200, { items: [], total: 0 });
      }
    });

    await page.goto('/settings/security');
    const settingsNavigation = page.getByRole('navigation', { name: '设置导航' });
    await expect(settingsNavigation).toBeVisible();
    await expect(settingsNavigation.getByRole('link', { name: '安全' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await settingsNavigation.getByRole('link', { name: '管理 Token' }).click();
    await expect(page).toHaveURL(/\/settings\/management-tokens$/);
  });
});
