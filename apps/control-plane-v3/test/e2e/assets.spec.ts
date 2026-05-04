import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('assets management', () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page, 'owner');
  });

  test('displays secrets list', async ({ page }) => {
    await page.goto('/assets');
    await expect(page.getByRole('heading', { name: '资产管理' })).toBeVisible();
    await expect(page.getByText('OpenAI production key')).toBeVisible();
  });

  test('displays capabilities list', async ({ page }) => {
    await page.goto('/assets');
    await expect(page.getByText('openai.config.bootstrap')).toBeVisible();
  });

  test('opens secret creation dialog', async ({ page }) => {
    await page.goto('/assets');
    await page.getByRole('button', { name: '新建密钥' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  });

  test('opens capability creation dialog', async ({ page }) => {
    await page.goto('/assets');
    await page.getByRole('button', { name: '新建能力' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  });
});
