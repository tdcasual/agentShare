import { type Page, type Route } from '@playwright/test';

export const sessionSummary = { id: 'admin', email: 'admin@example.com', auth_type: 'session' };
export const vaultgateSecret = {
  id: 'secret-1',
  name: 'Database credentials',
  type: 'password',
  url: 'https://db.example.com',
  username: null,
  description: null,
  tags: ['production'],
  metadata: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};
export const vaultgateAgent = {
  id: 'agent-1',
  name: 'Deploy Agent',
  description: 'Production deployer',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};
export const vaultgateToken = {
  id: 'token-1',
  agent_id: 'agent-1',
  name: 'CI/CD Token',
  description: null,
  status: 'active',
  key_prefix: 'vg_abc123',
  expires_at: null,
  last_used_at: null,
  created_at: '2024-01-01T00:00:00Z',
};
export const vaultgateAuditLog = {
  id: 'audit-1',
  actor_type: 'agent_token',
  actor_id: 'token-1',
  actor_label: 'vg_abc123',
  resource_type: 'secret',
  resource_id: 'secret-1',
  resource_label: 'Database credentials',
  action: 'secret.value.read',
  result: 'success',
  reason: null,
  request_id: 'request-1',
  created_at: '2024-01-15T12:00:00Z',
};

export async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export async function mockSession(page: Page) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method !== 'GET') {
      await fulfillJson(route, method === 'DELETE' ? 204 : 200, {});
      return;
    }
    const responses: Record<string, unknown> = {
      '/api/admin/bootstrap/status': { setup_required: false },
      '/api/admin/session': sessionSummary,
      '/api/admin/secrets': { items: [vaultgateSecret], total: 1 },
      '/api/admin/agents': { items: [vaultgateAgent], total: 1 },
      '/api/admin/agents/agent-1': vaultgateAgent,
      '/api/admin/agents/agent-1/tokens': { items: [vaultgateToken], total: 1 },
      '/api/admin/tokens/token-1/grants': { secret_ids: ['secret-1'] },
      '/api/admin/audit-logs': { items: [vaultgateAuditLog], total: 1 },
      '/api/admin/audit-stats': { total: 1, granted: 1, denied: 0, value_reads: 1 },
      '/api/admin/audit-actions': { items: ['secret.value.read', 'agent_token.issue'] },
      '/api/admin/management-tokens': {
        items: [
          {
            id: 'management-1',
            name: 'Deploy Automation',
            description: 'Production deployment API access',
            key_prefix: 'vgm_deploy',
            expires_at: '2027-01-01T00:00:00Z',
            revoked_at: null,
            last_used_at: null,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      },
    };
    await fulfillJson(route, 200, responses[path] ?? { items: [] });
  });
}

export async function mockUnauthenticated(page: Page) {
  await page.route('**/api/admin/bootstrap/status', (route) =>
    fulfillJson(route, 200, { setup_required: false })
  );
  await page.route('**/api/admin/session', (route) =>
    fulfillJson(route, 401, { detail: 'Unauthorized' })
  );
}

export async function mockSetupRequired(page: Page) {
  await page.route('**/api/admin/bootstrap/status', (route) =>
    fulfillJson(route, 200, { setup_required: true })
  );
}
