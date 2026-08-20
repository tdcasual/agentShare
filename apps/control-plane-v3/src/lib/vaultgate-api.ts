'use client';

import type { components } from './generated-api';

type JsonObject = Record<string, unknown>;
type RequestOptions = Omit<RequestInit, 'signal'> & { timeout?: number };
type ApiSchemas = components['schemas'];

function errorDetail(payload: JsonObject | null, fallback: string): string {
  if (typeof payload?.detail === 'string') {
    return payload.detail;
  }
  if (Array.isArray(payload?.detail)) {
    const messages = payload.detail
      .map((item) =>
        item && typeof item === 'object' && typeof (item as JsonObject).msg === 'string'
          ? String((item as JsonObject).msg)
          : null
      )
      .filter((item): item is string => Boolean(item));
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }
  return fallback || 'Request failed';
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

// Session expiry: any 401 from a non-session endpoint means the admin session
// is gone, so bounce to the login page instead of leaving a stale error on
// screen. Session endpoints are excluded so the route guard and login form
// can handle their own 401s.
function redirectToLoginOnSessionExpiry(path: string): void {
  if (typeof window === 'undefined' || typeof window.location?.replace !== 'function') {
    return;
  }
  if (path.startsWith('/api/admin/session')) {
    return;
  }
  const currentPath = window.location.pathname;
  if (currentPath === '/login' || currentPath === '/setup') {
    return;
  }
  try {
    window.location.replace('/login');
  } catch {
    // jsdom and hardened browsers may block programmatic navigation
  }
}

async function requestJson<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { timeout = 30_000, ...requestInit } = init;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
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
      if (response.status === 401) {
        redirectToLoginOnSessionExpiry(path);
      }
      throw new ApiError(response.status, errorDetail(payload, response.statusText));
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timeout');
    }
    if (error instanceof TypeError) {
      throw new ApiError(0, 'Network request failed');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export type BootstrapStatus = ApiSchemas['BootstrapStatusResponse'];
export type AdminSession = ApiSchemas['AdminSessionResponse'];
export interface LoginInput {
  email: string;
  password: string;
}
export interface PasswordChangeInput {
  current_password: string;
  new_password: string;
}
export type Secret = ApiSchemas['SecretResponse'];
export type SecretType = ApiSchemas['SecretType'];
export interface SecretCreateInput {
  name: string;
  type: SecretType;
  value: string;
  url?: string;
  documentation_url?: string;
  username?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  space_id?: string | null;
}
export interface SecretUpdateInput {
  name?: string;
  type?: SecretType;
  value?: string;
  url?: string | null;
  documentation_url?: string | null;
  username?: string | null;
  description?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  space_id?: string | null;
}
export type Agent = ApiSchemas['AgentResponse'];
export type AgentToken = ApiSchemas['AgentTokenResponse'];
export type AgentTokenOption = ApiSchemas['AgentTokenOptionResponse'];
export type IssuedAgentToken = ApiSchemas['IssuedAgentTokenResponse'];
export type ManagementToken = ApiSchemas['ManagementTokenSummary'];
export type IssuedManagementToken = ApiSchemas['ManagementTokenIssued'];
export type AuditLog = ApiSchemas['AuditLogResponse'];
export type VaultSpace = ApiSchemas['VaultSpaceResponse'];
export type SpaceMembership = ApiSchemas['SpaceMembershipResponse'];

export interface AgentInvite {
  id: string;
  label: string;
  code?: string;
  default_space_id: string | null;
  default_role: 'reader' | 'contributor' | 'maintainer';
  status: 'active' | 'consumed' | 'revoked' | 'expired';
  expires_at: string;
  created_at: string;
}
export interface AgentJoinRequest {
  id: string;
  invite_id: string;
  proposed_name: string;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  agent_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface PageQuery {
  limit?: number;
  offset?: number;
}

export type AgentTokenOptionQuery = PageQuery & {
  search?: string;
};

export type SecretQuery = PageQuery & {
  search?: string;
  type?: SecretType;
};

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
export const changePassword = (input: PasswordChangeInput) =>
  requestJson<void>('/api/admin/password', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export interface RevokeAllTokensResult {
  management_tokens_revoked: number;
  agent_tokens_revoked: number;
}

export const revokeAllTokens = () =>
  requestJson<RevokeAllTokensResult>('/api/admin/security/revoke-all-tokens', {
    method: 'POST',
  });

export const listManagementTokens = (query: PageQuery = {}) =>
  requestJson<PageResponse<ManagementToken>>(buildApiPath('/api/admin/management-tokens', query));
export const createManagementToken = (input: {
  name: string;
  description?: string;
  ttl_seconds?: number;
}) =>
  requestJson<IssuedManagementToken>('/api/admin/management-tokens', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'cache-control': 'no-store' },
  });
export const rotateManagementToken = (tokenId: string) =>
  requestJson<IssuedManagementToken>(`/api/admin/management-tokens/${tokenId}/rotate`, {
    method: 'POST',
    headers: { 'cache-control': 'no-store' },
  });
export const revokeManagementToken = (tokenId: string) =>
  requestJson<void>(`/api/admin/management-tokens/${tokenId}`, { method: 'DELETE' });

export const listSecrets = (query: SecretQuery = {}) =>
  requestJson<PageResponse<Secret>>(buildApiPath('/api/admin/secrets', query));
export const createSecret = (input: SecretCreateInput) =>
  requestJson<Secret>('/api/admin/secrets', { method: 'POST', body: JSON.stringify(input) });
export const updateSecret = (id: string, input: SecretUpdateInput) =>
  requestJson<Secret>(`/api/admin/secrets/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteSecret = (id: string) =>
  requestJson<void>(`/api/admin/secrets/${id}`, { method: 'DELETE' });
export const revealSecret = (id: string) =>
  requestJson<{ value: string }>(`/api/admin/secrets/${id}/value`);

export const listSpaces = () => requestJson<{ items: VaultSpace[] }>('/api/admin/spaces');
export const createSpace = (input: { name: string; description?: string }) =>
  requestJson<VaultSpace>('/api/admin/spaces', {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateSpace = (
  id: string,
  input: Partial<Pick<VaultSpace, 'name' | 'description' | 'status'>>
) =>
  requestJson<VaultSpace>(`/api/admin/spaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const deleteSpace = (id: string) =>
  requestJson<void>(`/api/admin/spaces/${id}`, { method: 'DELETE' });
export const getSpaceMemberships = (id: string) =>
  requestJson<{ members: SpaceMembership[] }>(`/api/admin/spaces/${id}/memberships`);
export const replaceSpaceMemberships = (id: string, members: SpaceMembership[]) =>
  requestJson<{ members: SpaceMembership[] }>(`/api/admin/spaces/${id}/memberships`, {
    method: 'PUT',
    body: JSON.stringify({ members }),
  });

export const listAgents = (query: PageQuery & { status?: Agent['status'] } = {}) =>
  requestJson<PageResponse<Agent>>(buildApiPath('/api/admin/agents', query));
export const getAgent = (id: string) => requestJson<Agent>(`/api/admin/agents/${id}`);
export const listAgentTokens = (agentId: string, query: PageQuery = {}) =>
  requestJson<PageResponse<AgentToken>>(buildApiPath(`/api/admin/agents/${agentId}/tokens`, query));
export const listAllAgentTokens = (query: AgentTokenOptionQuery = {}) =>
  requestJson<PageResponse<AgentTokenOption>>(buildApiPath('/api/admin/tokens', query));
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

export const createAgentInvite = (input: {
  label: string;
  space_id?: string;
  role: 'reader' | 'contributor' | 'maintainer';
  ttl_seconds?: number;
}) =>
  requestJson<AgentInvite & { code: string }>('/api/admin/agent-invites', {
    method: 'POST',
    body: JSON.stringify(input),
    headers: { 'Idempotency-Key': crypto.randomUUID(), 'cache-control': 'no-store' },
  });
export const listAgentInvites = () => requestJson<AgentInvite[]>('/api/admin/agent-invites');
export const revokeAgentInvite = (id: string) =>
  requestJson<void>(`/api/admin/agent-invites/${id}/revoke`, { method: 'POST' });
export const listAgentJoinRequests = () =>
  requestJson<AgentJoinRequest[]>('/api/admin/agent-join-requests');
export const approveAgentJoinRequest = (
  id: string,
  input: { token_name?: string; space_id?: string; role?: 'reader' | 'contributor' | 'maintainer' }
) =>
  requestJson<AgentJoinRequest>(`/api/admin/agent-join-requests/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const rejectAgentJoinRequest = (id: string, reason?: string) =>
  requestJson<AgentJoinRequest>(`/api/admin/agent-join-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export type AuditQuery = PageQuery & {
  result?: string;
  action?: string;
  actor_type?: string;
  actor_id?: string;
  actor_search?: string;
  resource_type?: string;
  resource_id?: string;
  resource_search?: string;
  created_from?: string;
  created_to?: string;
};

export type AuditStatsQuery = Pick<AuditQuery, 'created_from' | 'created_to'>;

export const listAuditLogs = (query: AuditQuery = {}) =>
  requestJson<PageResponse<AuditLog>>(buildApiPath('/api/admin/audit-logs', query));
export const getAuditStats = (query: AuditStatsQuery = {}) =>
  requestJson<{ total: number; granted: number; denied: number; value_reads: number }>(
    buildApiPath('/api/admin/audit-stats', query)
  );
export const listAuditActions = () => requestJson<{ items: string[] }>('/api/admin/audit-actions');
