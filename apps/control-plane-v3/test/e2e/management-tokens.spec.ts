import { expect, test } from '@playwright/test';
import { fulfillJson, mockSession } from './fixtures';

test.describe('Management token settings', () => {
  test.beforeEach(async ({ page }) => mockSession(page));

  test('lists tokens and shows newly issued plaintext once', async ({ page }) => {
    await page.route('**/api/admin/management-tokens', async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, 201, {
          id: 'management-2',
          name: 'Backup Automation',
          token: 'vgm_one_time_value',
          key_prefix: 'vgm_backup',
          expires_at: '2027-01-01T00:00:00Z',
          revoked_at: null,
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/settings/management-tokens');
    await expect(page.getByText('Deploy Automation')).toBeVisible();
    await expect(page.getByText('Production deployment API access')).toBeVisible();

    await page.getByLabel('Token 名称').fill('Backup Automation');
    await page.getByRole('button', { name: '签发 Token' }).click();
    await expect(page.getByText('请立即复制此 Token')).toBeVisible();
    await expect(page.getByText('vgm_one_time_value')).toBeVisible();
  });
});
