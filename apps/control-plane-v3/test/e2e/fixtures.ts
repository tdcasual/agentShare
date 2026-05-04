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

export const adminAccount = {
  id: 'admin-1',
  email: 'owner@example.com',
  role: 'owner',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
};

export const agent = {
  id: 'agent-1',
  name: 'Test Agent',
  status: 'active',
  presence: 'online',
  actor_type: 'openclaw_agent',
  created_at: '2024-01-01T00:00:00Z',
  workspace_root: '/workspace/agent-1',
  agent_dir: '/workspace/agent-1/.agent',
  auth_method: 'api_key',
  risk_tier: 'low',
  model: 'gpt-4',
  thinking_level: 'standard',
  sandbox_mode: 'isolated',
  dream_policy: { enabled: false, max_runs: 3, cooldown_seconds: 60 },
  allowed_task_types: ['config_sync'],
  allowed_capability_ids: ['capability-1'],
};

export const accessToken = {
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

export const secret = {
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

export const capability = {
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

export const task = {
  id: 'task-1',
  title: 'Test Task',
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
};

export const event = {
  id: 'event-1',
  event_type: 'agent.completed',
  actor_type: 'agent',
  actor_id: 'agent-1',
  summary: 'Agent completed a task',
  created_at: '2024-01-01T00:00:00Z',
};

export const space = {
  id: 'space-1',
  name: 'Test Space',
  description: 'A test collaboration space',
  members: [
    { member_type: 'agent', member_id: 'agent-1', role: 'viewer', created_at: '2024-01-01T00:00:00Z' },
  ],
  timeline: [
    { id: 'tl-1', summary: 'Agent joined', entry_type: 'member_joined', created_at: '2024-01-01T00:00:00Z' },
  ],
  created_at: '2024-01-01T00:00:00Z',
};

export const review = {
  id: 'review-1',
  resource_kind: 'secret',
  resource_id: 'secret-1',
  publication_status: 'pending_review',
  submitted_by: 'owner',
  submitted_at: '2024-01-01T00:00:00Z',
};

export const playbook = {
  id: 'playbook-1',
  title: 'Test Playbook',
  body: 'A test playbook body',
  task_type: 'config_sync',
  tags: [],
  publication_status: 'active',
};

export const run = {
  id: 'run-1',
  task_id: 'task-1',
  status: 'completed',
  output: {},
  started_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T00:01:00Z',
};

export const approval = {
  id: 'approval-1',
  resource_kind: 'secret',
  resource_id: 'secret-1',
  status: 'pending',
  requested_by: 'owner',
  requested_at: '2024-01-01T00:00:00Z',
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

    const singleResponses: Record<string, unknown> = {
      '/openclaw/agents/agent-1': agent,
    };

    const singleMatch = Object.keys(singleResponses).find((p) => path === p || path.startsWith(`${p}/`));
    if (singleMatch) {
      await fulfillJson(route, 200, singleResponses[singleMatch]);
      return;
    }

    const listResponses: Record<string, unknown> = {
      '/bootstrap/status': { initialized: true },
      '/session/me': { ...sessionSummary, role },
      '/events': { items: [event] },
      '/openclaw/agents': { items: [agent] },
      '/openclaw/dream-runs': { items: [] },
      '/openclaw/sessions': { items: [] },
      '/admin-accounts': { items: [adminAccount] },
      '/access-tokens': { items: [accessToken] },
      '/secrets': { items: [secret] },
      '/capabilities': { items: [capability] },
      '/tasks': { items: [task] },
      '/runs': { items: [run] },
      '/spaces': { items: [space] },
      '/reviews': { items: [review] },
      '/approvals': { items: [approval] },
      '/playbooks/search': { items: [playbook], meta: { total: 1, items_count: 1, applied_filters: {} } },
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
