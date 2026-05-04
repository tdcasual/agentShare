import { expect, type Page, type Route, test } from '@playwright/test';

type PublishEndpoint = 'secret' | 'capability' | 'task';

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

const accessToken = {
  id: 'token-1',
  display_name: 'Primary Token',
  token_prefix: 'cp_tok_123',
  subject_type: 'openclaw_agent',
  subject_id: 'agent-1',
  status: 'active',
  scopes: [],
  labels: {},
  policy: {},
  trust_score: 0.82,
};

const secret = {
  id: 'secret-1',
  display_name: 'OpenAI production key',
  kind: 'api_token',
  provider: 'openai',
  environment: 'production',
  provider_scopes: ['responses.read'],
  resource_selector: 'project:agent-share',
  metadata: {},
  backend_ref: 'demo/secret-1',
  publication_status: 'active',
};

const capability = {
  id: 'capability-1',
  name: 'openai.config.bootstrap',
  secret_id: 'secret-1',
  risk_level: 'medium',
  allowed_mode: 'proxy_or_lease',
  lease_ttl_seconds: 120,
  approval_mode: 'manual',
  approval_rules: [],
  allowed_audience: [],
  access_policy: { mode: 'all_access_tokens', selectors: [] },
  required_provider: 'openai',
  required_provider_scopes: ['responses.read'],
  allowed_environments: [],
  adapter_type: 'openai',
  adapter_config: {},
  publication_status: 'active',
};

async function mockControlPlaneApi(
  page: Page,
  failingEndpoint: PublishEndpoint,
  failureMessage: string
) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();

    if (method === 'POST' && path === '/secrets') {
      await fulfillJson(route, failingEndpoint === 'secret' ? 503 : 201, {
        ...(failingEndpoint === 'secret' ? { detail: failureMessage } : secret),
      });
      return;
    }

    if (method === 'POST' && path === '/capabilities') {
      await fulfillJson(route, failingEndpoint === 'capability' ? 503 : 201, {
        ...(failingEndpoint === 'capability' ? { detail: failureMessage } : capability),
      });
      return;
    }

    if (method === 'POST' && path === '/tasks') {
      await fulfillJson(route, failingEndpoint === 'task' ? 503 : 201, {
        ...(failingEndpoint === 'task'
          ? { detail: failureMessage }
          : {
              id: 'task-new',
              title: '发布失败回归任务',
              task_type: 'config_sync',
              priority: 'normal',
              status: 'pending',
              publication_status: 'active',
              target_mode: 'explicit_access_tokens',
              input: {},
              target_ids: ['target-1'],
              target_access_token_ids: ['token-1'],
              created_by_actor_type: 'human',
              created_by_actor_id: 'owner',
            }),
      });
      return;
    }

    if (method !== 'GET') {
      await fulfillJson(route, 200, {});
      return;
    }

    const listResponses: Record<string, unknown> = {
      '/bootstrap/status': { initialized: true },
      '/session/me': sessionSummary,
      '/events': { items: [] },
      '/openclaw/agents': { items: [] },
      '/openclaw/dream-runs': { items: [] },
      '/openclaw/sessions': { items: [] },
      '/admin-accounts': { items: [] },
      '/access-tokens': { items: [accessToken] },
      '/secrets': { items: [secret] },
      '/capabilities': { items: [capability] },
      '/tasks': { items: [] },
      '/runs': { items: [] },
    };

    await fulfillJson(route, 200, listResponses[path] ?? { items: [] });
  });
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

test.describe('publish failure feedback', () => {
  test('shows an error when secret publishing fails', async ({ page }) => {
    await mockControlPlaneApi(page, 'secret', 'Secret backend unavailable');

    await page.goto('/assets');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: '资产管理' })).toBeVisible();

    await page.getByRole('button', { name: '新建密钥' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog', { name: '发布密钥' });
    await dialog.getByLabel('显示名称').fill('E2E OpenAI key');
    await dialog.getByLabel('密钥值').fill('sk-test-secret');
    await dialog.getByRole('button', { name: '创建密钥' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Secret backend unavailable');
    await expect(dialog).toBeVisible();
  });

  test('shows an error when capability publishing fails', async ({ page }) => {
    await mockControlPlaneApi(page, 'capability', 'Capability publisher rejected policy');

    await page.goto('/assets');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: '资产管理' })).toBeVisible();

    await page.getByRole('button', { name: '新建能力' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog', { name: '发布 capability' });
    await dialog.getByLabel('Capability 名称').fill('openai.e2e.failure');
    await dialog.getByLabel('绑定密钥').selectOption('secret-1');
    await dialog.getByRole('button', { name: '创建 capability' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Capability publisher rejected policy');
    await expect(dialog).toBeVisible();
  });

  test('shows an error when task publishing fails', async ({ page }) => {
    await mockControlPlaneApi(page, 'task', 'Task backend unavailable');

    await page.goto('/tasks');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: '任务编排' })).toBeVisible();

    await page.getByRole('button', { name: '发布任务' }).click();
    await page.waitForTimeout(500);
    const dialog = page.getByRole('dialog', { name: '发布任务' });
    await dialog.getByLabel('标题').fill('发布失败回归任务');
    await dialog.getByText('Primary Token').click();
    await dialog.getByRole('button', { name: '发布任务' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Task backend unavailable');
    await expect(dialog).toBeVisible();
  });
});
