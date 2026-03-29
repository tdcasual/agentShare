'use client';

import type {
  AdminAccountSummary,
  AgentSummary,
  AgentTokenSummary,
  BootstrapStatus,
  ManagementSessionSummary,
  ReviewQueueItem,
  RunSummary,
  TaskSummary,
  TokenFeedbackSummary,
} from '@/shared/types';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as JsonValue) : null;

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string'
        ? payload.detail
        : response.statusText;
    throw new ApiError(response.status, detail);
  }

  return payload as T;
}

export interface SetupOwnerInput {
  bootstrap_key: string;
  email: string;
  display_name: string;
  password: string;
}

export interface AgentCreateInput {
  name: string;
  risk_tier: string;
  allowed_capability_ids?: string[];
  allowed_task_types?: string[];
}

export interface AgentCreateResponse {
  id: string;
  name: string;
  risk_tier: string;
  api_key: string;
  token_id: string;
  token_prefix: string;
}

export interface AgentTokenCreateInput {
  display_name: string;
  scopes?: string[];
  labels?: Record<string, string>;
  expires_at?: string | null;
}

export interface AdminAccountCreateInput {
  email: string;
  display_name: string;
  password: string;
  role: 'viewer' | 'operator' | 'admin';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TaskCreateInput {
  title: string;
  task_type: string;
  input?: Record<string, unknown>;
  required_capability_ids?: string[];
  playbook_ids?: string[];
  lease_allowed?: boolean;
  approval_mode?: 'auto' | 'manual';
  approval_rules?: Array<Record<string, unknown>>;
  priority?: string;
  target_token_ids?: string[];
  target_mode?: 'explicit_tokens' | 'broadcast';
}

export interface TokenFeedbackCreateInput {
  score: number;
  verdict: string;
  summary: string;
}

export const api = {
  getBootstrapStatus: () => apiFetch<BootstrapStatus>('/api/bootstrap/status'),
  setupOwner: (payload: SetupOwnerInput) =>
    apiFetch<{ initialized: boolean; account: { id: string; email: string; display_name: string; role: string; status: string } }>(
      '/api/bootstrap/setup-owner',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
  login: (payload: LoginInput) =>
    apiFetch<ManagementSessionSummary>('/api/session/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => apiFetch<{ status: string }>('/api/session/logout', { method: 'POST' }),
  getSession: () => apiFetch<ManagementSessionSummary>('/api/session/me'),
  getAgents: () => apiFetch<{ items: AgentSummary[] }>('/api/agents'),
  createAgent: (payload: AgentCreateInput) =>
    apiFetch<AgentCreateResponse>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAgentTokens: (agentId: string) =>
    apiFetch<{ items: AgentTokenSummary[] }>(`/api/agents/${agentId}/tokens`),
  createAgentToken: (agentId: string, payload: AgentTokenCreateInput) =>
    apiFetch<AgentTokenSummary>(`/api/agents/${agentId}/tokens`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revokeAgentToken: (tokenId: string) =>
    apiFetch<{ id: string; status: string }>(`/api/agent-tokens/${tokenId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getAdminAccounts: () => apiFetch<{ items: AdminAccountSummary[] }>('/api/admin-accounts'),
  createAdminAccount: (payload: AdminAccountCreateInput) =>
    apiFetch<AdminAccountSummary>('/api/admin-accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  disableAdminAccount: (accountId: string) =>
    apiFetch<{ id: string; status: string }>(`/api/admin-accounts/${accountId}/disable`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getReviews: () => apiFetch<{ items: ReviewQueueItem[] }>('/api/reviews'),
  approveReview: (resourceKind: string, resourceId: string) =>
    apiFetch<ReviewQueueItem>(`/api/reviews/${resourceKind}/${resourceId}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  rejectReview: (resourceKind: string, resourceId: string) =>
    apiFetch<ReviewQueueItem>(`/api/reviews/${resourceKind}/${resourceId}/reject`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  getTasks: () => apiFetch<{ items: TaskSummary[] }>('/api/tasks'),
  createTask: (payload: TaskCreateInput) =>
    apiFetch<TaskSummary>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRuns: () => apiFetch<{ items: RunSummary[] }>('/api/runs'),
  createTaskTargetFeedback: (targetId: string, payload: TokenFeedbackCreateInput) =>
    apiFetch<TokenFeedbackSummary>(`/api/task-targets/${targetId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTokenFeedback: (tokenId: string) =>
    apiFetch<{ items: TokenFeedbackSummary[] }>(`/api/agent-tokens/${tokenId}/feedback`),
};
