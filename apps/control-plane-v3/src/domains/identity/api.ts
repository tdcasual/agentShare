/**
 * Identity Domain API
 *
 * 负责：
 * - 认证管理 (login/logout/session)
 * - 引导流程 (bootstrap)
 * - 账号管理 (agents, admin accounts)
 */

import {
  apiFetch,
  SetupOwnerInput,
  LoginInput,
  AdminAccountCreateInput,
  AccessTokenCreateInput,
  AccessTokenCreateResponse,
} from '@/lib/api-client';
import type {
  BootstrapStatus,
  ManagementSessionSummary,
  AdminAccountSummary,
  OpenClawAgent,
  OpenClawAgentFile,
  OpenClawDreamRunDetail,
  OpenClawDreamRun,
  OpenClawSession,
} from './types';
import { normalizeAccessToken, type AccessTokenTransport } from '../shared-types';

export interface OpenClawAgentCreateInput {
  name: string;
  workspace_root: string;
  agent_dir: string;
  model?: string | null;
  thinking_level?: string;
  sandbox_mode?: string;
  risk_tier?: string;
  auth_method?: string;
  dream_policy?: Record<string, unknown>;
  tools_policy?: Record<string, unknown>;
  skills_policy?: Record<string, unknown>;
  allowed_capability_ids?: string[];
  allowed_task_types?: string[];
}

export interface OpenClawAgentUpdateInput extends Partial<OpenClawAgentCreateInput> {
  status?: string;
}

// ============================================
// 引导流程 (Bootstrap)
// ============================================

export function getBootstrapStatus() {
  return apiFetch<BootstrapStatus>('/bootstrap/status');
}

export function setupOwner(payload: SetupOwnerInput) {
  return apiFetch<{
    initialized: boolean;
    account: { id: string; email: string; display_name: string; role: string; status: string };
  }>('/bootstrap/setup-owner', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============================================
// 会话管理 (Session)
// ============================================

export function login(payload: LoginInput) {
  return apiFetch<ManagementSessionSummary>('/session/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiFetch<{ status: string }>('/session/logout', { method: 'POST' });
}

export function getSession() {
  return apiFetch<ManagementSessionSummary>('/session/me');
}

// ============================================
// OpenClaw Agents
// ============================================

export function getOpenClawAgents() {
  return apiFetch<{ items: OpenClawAgent[] }>('/openclaw/agents');
}

export function getOpenClawAgent(agentId: string) {
  return apiFetch<OpenClawAgent>(`/openclaw/agents/${agentId}`);
}

export function createOpenClawAgent(payload: OpenClawAgentCreateInput) {
  return apiFetch<OpenClawAgent>('/openclaw/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOpenClawAgent(agentId: string, payload: OpenClawAgentUpdateInput) {
  return apiFetch<OpenClawAgent>(`/openclaw/agents/${agentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteOpenClawAgent(agentId: string) {
  return apiFetch<{ id: string; status: string }>(`/openclaw/agents/${agentId}`, {
    method: 'DELETE',
  });
}

export function getOpenClawSessions() {
  return apiFetch<{ items: OpenClawSession[] }>('/openclaw/sessions');
}

export function getOpenClawDreamRuns() {
  return apiFetch<{ items: OpenClawDreamRun[] }>('/openclaw/dream-runs');
}

export function getOpenClawDreamRun(runId: string) {
  return apiFetch<OpenClawDreamRunDetail>(`/openclaw/dream-runs/${runId}`);
}

export function pauseOpenClawDreamRun(runId: string, reason: string) {
  return apiFetch<OpenClawDreamRun>(`/openclaw/dream-runs/${runId}/pause`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function resumeOpenClawDreamRun(runId: string) {
  return apiFetch<OpenClawDreamRun>(`/openclaw/dream-runs/${runId}/resume`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function getOpenClawFiles(agentId: string) {
  return apiFetch<{ items: OpenClawAgentFile[] }>(`/openclaw/agents/${agentId}/files`);
}

// ============================================
// Admin Accounts
// ============================================

export function getAdminAccounts() {
  return apiFetch<{ items: AdminAccountSummary[] }>('/admin-accounts');
}

export function createAdminAccount(payload: AdminAccountCreateInput) {
  return apiFetch<AdminAccountSummary>('/admin-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function disableAdminAccount(accountId: string) {
  return apiFetch<{ id: string; status: string }>(`/admin-accounts/${accountId}/disable`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ============================================
// Access Tokens
// ============================================

export function getAccessTokens() {
  return apiFetch<{ items: AccessTokenTransport[] }>('/access-tokens').then(({ items }) => ({
    items: items.map(normalizeAccessToken),
  }));
}

export function createAccessToken(payload: AccessTokenCreateInput) {
  return apiFetch<AccessTokenCreateResponse>('/access-tokens', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function revokeAccessToken(tokenId: string) {
  return apiFetch<{ id: string; status: string }>(`/access-tokens/${tokenId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ============================================
// 向后兼容的 API 对象
// ============================================

export const identityApi = {
  // Bootstrap
  getBootstrapStatus,
  setupOwner,
  // Session
  login,
  logout,
  getSession,
  // OpenClaw agents
  getOpenClawAgents,
  getOpenClawAgent,
  createOpenClawAgent,
  updateOpenClawAgent,
  deleteOpenClawAgent,
  getOpenClawSessions,
  getOpenClawDreamRuns,
  getOpenClawDreamRun,
  pauseOpenClawDreamRun,
  resumeOpenClawDreamRun,
  getOpenClawFiles,
  // Admin Accounts
  getAdminAccounts,
  createAdminAccount,
  disableAdminAccount,
  // Access Tokens
  getAccessTokens,
  createAccessToken,
  revokeAccessToken,
};
