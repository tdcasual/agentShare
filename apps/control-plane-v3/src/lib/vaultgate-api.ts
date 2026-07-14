'use client';

type JsonObject = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const { timeout = 30_000, signal, ...requestInit } = init;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  const abortRequest = () => controller.abort();
  signal?.addEventListener('abort', abortRequest, { once: true });
  const headers = new Headers(requestInit.headers);
  if (requestInit.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  try {
    const response = await fetch(path, {
      ...requestInit,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: JsonObject | null = null;
    if (text) {
      try {
        payload = JSON.parse(text) as JsonObject;
      } catch {
        throw new ApiError(
          response.status,
          response.ok
            ? 'Invalid JSON response'
            : text.trim() || response.statusText || 'Request failed'
        );
      }
    }
    if (!response.ok) {
      const detail = typeof payload?.detail === 'string' ? payload.detail : response.statusText;
      throw new ApiError(response.status, detail || 'Request failed');
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timeout');
    }
    throw error;
  } finally {
    signal?.removeEventListener('abort', abortRequest);
    window.clearTimeout(timer);
  }
}

export const apiFetch = requestJson;

export interface BootstrapStatus {
  setup_required: boolean;
  bootstrap_token_required: boolean;
}
export interface AdminSession {
  id: string;
  email: string;
  auth_type: 'session' | 'management_token';
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface Secret {
  id: string;
  name: string;
  type: SecretType;
  url: string | null;
  username: string | null;
  description: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
export type SecretType =
  | 'password'
  | 'api_key'
  | 'basic_auth'
  | 'bearer_token'
  | 'api_key_header'
  | 'oauth_token'
  | 'certificate'
  | 'ssh_key'
  | 'database_url'
  | 'custom';
export interface SecretCreateInput {
  name: string;
  type: SecretType;
  value: string;
  url?: string;
  username?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
export type SecretUpdateInput = Partial<SecretCreateInput>;
export interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}
export interface AgentToken {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  status: 'active' | 'revoked';
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}
export interface IssuedAgentToken extends AgentToken {
  token: string;
}
export type AgentDetail = Agent;
export interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string | null;
  actor_label: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_label: string | null;
  action: string;
  result: 'success' | 'denied';
  reason: string | null;
  request_id: string | null;
  created_at: string;
}

export interface PageQuery {
  limit?: number;
  offset?: number;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  limit?: number;
  offset?: number;
}

export function buildApiPath(path: string, query: object = {}): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(
    ([key, value]) => value !== undefined && params.set(key, String(value))
  );
  return `${path}${params.size ? `?${params}` : ''}`;
}

export const getBootstrapStatus = () => requestJson<BootstrapStatus>('/api/admin/bootstrap/status');
export const bootstrap = (input: LoginInput, bootstrapToken?: string) =>
  requestJson<{ id: string; email: string }>('/api/admin/bootstrap/init', {
    method: 'POST',
    headers: bootstrapToken ? { 'X-Bootstrap-Token': bootstrapToken } : undefined,
    body: JSON.stringify(input),
  });
export const login = (input: LoginInput) =>
  requestJson<{ status: string; email: string }>('/api/admin/session/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const logout = () => requestJson<void>('/api/admin/session', { method: 'DELETE' });
export const getCurrentSession = () => requestJson<AdminSession>('/api/admin/session');

export const listSecrets = (query: PageQuery = {}) =>
  requestJson<PageResponse<Secret>>(buildApiPath('/api/admin/secrets', query));
export const createSecret = (input: SecretCreateInput) =>
  requestJson<Secret>('/api/admin/secrets', { method: 'POST', body: JSON.stringify(input) });
export const updateSecret = (id: string, input: SecretUpdateInput) =>
  requestJson<Secret>(`/api/admin/secrets/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteSecret = (id: string) =>
  requestJson<void>(`/api/admin/secrets/${id}`, { method: 'DELETE' });
export const revealSecret = (id: string) =>
  requestJson<{ value: string }>(`/api/admin/secrets/${id}/value`);

export const listAgents = (query: PageQuery & { status?: Agent['status'] } = {}) =>
  requestJson<PageResponse<Agent>>(buildApiPath('/api/admin/agents', query));
export const getAgent = (id: string) => requestJson<AgentDetail>(`/api/admin/agents/${id}`);
export const listAgentTokens = (agentId: string, query: PageQuery = {}) =>
  requestJson<PageResponse<AgentToken>>(buildApiPath(`/api/admin/agents/${agentId}/tokens`, query));
export const createAgent = (input: { name: string; description?: string }) =>
  requestJson<Agent>('/api/admin/agents', { method: 'POST', body: JSON.stringify(input) });
export const updateAgent = (
  id: string,
  input: Partial<Pick<Agent, 'name' | 'description' | 'status'>>
) =>
  requestJson<Agent>(`/api/admin/agents/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const issueAgentToken = (
  agentId: string,
  input: { name: string; description?: string; ttl_seconds?: number }
) =>
  requestJson<IssuedAgentToken>(`/api/admin/agents/${agentId}/tokens`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const rotateAgentToken = (tokenId: string) =>
  requestJson<IssuedAgentToken>(`/api/admin/tokens/${tokenId}/rotate`, { method: 'POST' });
export const revokeAgentToken = (tokenId: string) =>
  requestJson<void>(`/api/admin/tokens/${tokenId}`, { method: 'DELETE' });
export const getTokenGrants = (tokenId: string) =>
  requestJson<{ secret_ids: string[] }>(`/api/admin/tokens/${tokenId}/grants`);
export const replaceTokenGrants = (tokenId: string, secretIds: string[]) =>
  requestJson<{ secret_ids: string[] }>(`/api/admin/tokens/${tokenId}/grants`, {
    method: 'PUT',
    body: JSON.stringify({ secret_ids: secretIds }),
  });

export type AuditQuery = PageQuery & {
  result?: string;
  action?: string;
  actor_type?: string;
  actor_id?: string;
  resource_type?: string;
  resource_id?: string;
  created_from?: string;
  created_to?: string;
};

export const listAuditLogs = (query: AuditQuery = {}) =>
  requestJson<PageResponse<AuditLog>>(buildApiPath('/api/admin/audit-logs', query));
export const getAuditStats = () =>
  requestJson<{ total: number; granted: number; denied: number; value_reads: number }>(
    '/api/admin/audit-stats'
  );
