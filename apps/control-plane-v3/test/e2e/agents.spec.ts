import { expect, test } from '@playwright/test';
import { mockSession } from './fixtures';

test.describe('Agent management', () => {
  test.beforeEach(async ({ page }) => mockSession(page));

  test('lists Agents and opens the Agent detail', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.getByText('Deploy Agent')).toBeVisible();
    await page.getByText('Deploy Agent').click();
    await expect(page).toHaveURL(/agents\/agent-1/);
    await expect(page.getByRole('heading', { name: 'CI/CD Token' })).toBeVisible();
  });

  test('protects unsaved grants when switching tokens', async ({ page }) => {
    const secondToken = {
      id: 'token-2',
      agent_id: 'agent-1',
      name: 'Reporting Token',
      description: null,
      status: 'active',
      key_prefix: 'vg_report',
      expires_at: null,
      last_used_at: null,
      created_at: '2024-01-02T00:00:00Z',
    };
    await page.route('**/api/admin/agents/agent-1/tokens**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'token-1',
              agent_id: 'agent-1',
              name: 'CI/CD Token',
              description: null,
              status: 'active',
              key_prefix: 'vg_abc123',
              expires_at: null,
              last_used_at: null,
              created_at: '2024-01-01T00:00:00Z',
            },
            secondToken,
          ],
          total: 2,
        }),
      })
    );
    await page.route('**/api/admin/tokens/token-2/grants', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"secret_ids":[]}' })
    );

    await page.goto('/agents/agent-1');
    const grant = page.getByRole('checkbox');
    await grant.uncheck();
    await page.getByRole('button', { name: /Reporting Token/ }).click();

    await expect(page.getByRole('alertdialog')).toContainText('放弃未保存的授权');
    await page.getByRole('button', { name: '取消' }).click();
    await expect(page.getByRole('heading', { name: 'CI/CD Token' })).toBeVisible();

    await page.getByRole('button', { name: /Reporting Token/ }).click();
    await page.getByRole('button', { name: '放弃更改' }).click();
    await expect(page.getByRole('heading', { name: 'Reporting Token' })).toBeVisible();
  });
});
