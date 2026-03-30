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
  AgentCreateInput,
  AgentCreateResponse,
  AdminAccountCreateInput,
  AgentTokenCreateInput,
  AgentTokenCreateResponse,
} from '@/lib/api-client';
import type { Identity, Agent, BootstrapStatus, ManagementSessionSummary, AdminAccountSummary } from './types';
import type { AgentToken } from '../task/types';

// ============================================
// 引导流程 (Bootstrap)
// ============================================

export function getBootstrapStatus() {
  return apiFetch<BootstrapStatus>('/api/bootstrap/status');
}

export function setupOwner(payload: SetupOwnerInput) {
  return apiFetch<{ initialized: boolean; account: { id: string; email: string; display_name: string; role: string; status: string } }>(
    '/api/bootstrap/setup-owner',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================
// 会话管理 (Session)
// ============================================

export function login(payload: LoginInput) {
  return apiFetch<ManagementSessionSummary>('/api/session/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiFetch<{ status: string }>('/api/session/logout', { method: 'POST' });
}

export function getSession() {
  return apiFetch<ManagementSessionSummary>('/api/session/me');
}

// ============================================
// Agents
// ============================================

export function getAgents() {
  return apiFetch<{ items: Agent[] }>('/api/agents');
}

export function createAgent(payload: AgentCreateInput) {
  return apiFetch<AgentCreateResponse>('/api/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============================================
// Admin Accounts
// ============================================

export function getAdminAccounts() {
  return apiFetch<{ items: AdminAccountSummary[] }>('/api/admin-accounts');
}

export function createAdminAccount(payload: AdminAccountCreateInput) {
  return apiFetch<AdminAccountSummary>('/api/admin-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function disableAdminAccount(accountId: string) {
  return apiFetch<{ id: string; status: string }>(`/api/admin-accounts/${accountId}/disable`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ============================================
// Agent Tokens
// ============================================

export function getAgentTokens(agentId: string) {
  return apiFetch<{ items: AgentToken[] }>(`/api/agents/${agentId}/tokens`);
}

export function createAgentToken(agentId: string, payload: AgentTokenCreateInput) {
  return apiFetch<AgentTokenCreateResponse>(`/api/agents/${agentId}/tokens`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function revokeAgentToken(tokenId: string) {
  return apiFetch<{ id: string; status: string }>(`/api/agent-tokens/${tokenId}/revoke`, {
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
  // Agents
  getAgents,
  createAgent,
  // Admin Accounts
  getAdminAccounts,
  createAdminAccount,
  disableAdminAccount,
  // Agent Tokens
  getAgentTokens,
  createAgentToken,
  revokeAgentToken,
};
