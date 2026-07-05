/**
 * Shared E2E test fixtures for VaultGate control plane.
 *
 * Only includes mock data for features that exist in the current VaultGate app.
 * Legacy Agent Control Plane fixtures (agents, spaces, tasks, etc.) have been removed.
 */
import { type Page, type Route } from '@playwright/test';

export const sessionSummary = {
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

// VaultGate mock data — matches the actual backend API schemas
export const vaultgateSecret = {
  id: 'secret-1',
  name: 'Database credentials',
  type: 'password',
  url: 'https://db.example.com',
  tags: ['production'],
  created_at: '2024-01-01T00:00:00Z',
};

export const vaultgateToken = {
  id: 'token-1',
  name: 'CI/CD Token',
  description: 'Token for automated deployments',
  status: 'active',
  key_prefix: 'vg_abc123',
  expires_at: null,
  last_used_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  scopes_count: 2,
};

export const vaultgateAuditLog = {
  id: 'audit-1',
  action: 'read',
  status: 'granted',
  token_prefix: 'vg_abc123',
  secret_id: 'secret-1',
  ip_address: '127.0.0.1',
  created_at: '2024-01-15T12:00:00Z',
};

export async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function mockSession(page: Page, role = 'owner') {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();

    if (method !== 'GET') {
      await fulfillJson(route, 200, {});
      return;
    }

    const listResponses: Record<string, unknown> = {
      '/bootstrap/status': { initialized: true },
      '/session/me': { ...sessionSummary, role },
      '/session/logout': { status: 'logged_out' },
      '/secrets': { items: [vaultgateSecret], total: 1 },
      '/tokens': { items: [vaultgateToken], total: 1 },
      '/audit-logs': { items: [vaultgateAuditLog], total: 1 },
    };

    await fulfillJson(route, 200, listResponses[path] ?? { items: [] });
  });
}

export async function mockUnauthenticated(page: Page) {
  await page.route('**/api/session/me', async (route) => {
    await fulfillJson(route, 401, { detail: 'Unauthorized' });
  });
  await page.route('**/api/bootstrap/status', async (route) => {
    await fulfillJson(route, 200, { initialized: true });
  });
}

export async function mockSetupRequired(page: Page) {
  await page.route('**/api/bootstrap/status', async (route) => {
    await fulfillJson(route, 200, { initialized: false });
  });
}
