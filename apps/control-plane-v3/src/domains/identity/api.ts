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
  OpenClawSessionCreateInput,
  WorkbenchSessionSummary,
  WorkbenchMessageSummary,
  WorkbenchSessionCreateInput,
  WorkbenchMessageInput,
  WorkbenchMessageCreateResponse,
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

export function createOpenClawSession(agentId: string, payload: OpenClawSessionCreateInput) {
  return apiFetch<OpenClawSession>(`/openclaw/agents/${agentId}/sessions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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

export function revokeOpenClawSession(sessionId: string) {
  return apiFetch<{ id: string; status: string }>(`/openclaw/sessions/${sessionId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function getAgentWorkbenchSessions(agentId: string) {
  return apiFetch<{ items: WorkbenchSessionSummary[] }>(`/openclaw/agents/${agentId}/workbench/sessions`);
}

export function createAgentWorkbenchSession(agentId: string, payload: WorkbenchSessionCreateInput) {
  return apiFetch<WorkbenchSessionSummary>(`/openclaw/agents/${agentId}/workbench/sessions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getWorkbenchSession(conversationId: string) {
  return apiFetch<WorkbenchSessionSummary>(`/openclaw/workbench/sessions/${conversationId}`);
}

export function getWorkbenchMessages(conversationId: string) {
  return apiFetch<{ items: WorkbenchMessageSummary[] }>(`/openclaw/workbench/sessions/${conversationId}/messages`);
}

export function sendWorkbenchMessage(conversationId: string, payload: WorkbenchMessageInput) {
  return apiFetch<WorkbenchMessageCreateResponse>(`/openclaw/workbench/sessions/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
  createOpenClawSession,
  getOpenClawDreamRuns,
  getOpenClawDreamRun,
  pauseOpenClawDreamRun,
  resumeOpenClawDreamRun,
  getOpenClawFiles,
  revokeOpenClawSession,
  getAgentWorkbenchSessions,
  createAgentWorkbenchSession,
  getWorkbenchSession,
  getWorkbenchMessages,
  sendWorkbenchMessage,
  // Admin Accounts
  getAdminAccounts,
  createAdminAccount,
  disableAdminAccount,
  // Access Tokens
  getAccessTokens,
  createAccessToken,
  revokeAccessToken,
};
