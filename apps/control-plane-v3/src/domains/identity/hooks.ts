/**
 * Identity Domain Hooks
 * 
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { swrConfig, pollingConfig, staticConfig } from '@/lib/swr-config';
import * as api from './api';
import type { Identity, Agent, BootstrapStatus, ManagementSessionSummary, AdminAccountSummary } from './types';
import type { AgentToken } from '../task/types';
import type { AgentCreateInput, AdminAccountCreateInput, LoginInput, SetupOwnerInput, AgentTokenCreateInput } from '@/lib/api-client';

const AGENT_TOKENS_BULK_KEY = 'bulk:agent-tokens';

// ============================================
// Bootstrap
// ============================================

export function useBootstrapStatus(options?: SWRConfiguration) {
  return useSWR<BootstrapStatus>(
    '/api/bootstrap/status',
    () => api.getBootstrapStatus(),
    {
      ...staticConfig,
      ...options,
    }
  );
}

// ============================================
// Session
// ============================================

export function useSession(options?: SWRConfiguration) {
  return useSWR<ManagementSessionSummary>(
    '/api/session/me',
    () => api.getSession(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useLogin() {
  return async (payload: LoginInput) => {
    const result = await api.login(payload);
    await mutate('/api/session/me', result, false);
    return result;
  };
}

export function useLogout() {
  return async () => {
    const result = await api.logout();
    await mutate('/api/session/me', null, false);
    return result;
  };
}

// ============================================
// Agents
// ============================================

export function useAgents(options?: SWRConfiguration) {
  return useSWR<{ items: Agent[] }>(
    '/api/agents',
    () => api.getAgents(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateAgent() {
  return async (payload: AgentCreateInput) => {
    const result = await api.createAgent(payload);
    await mutate('/api/agents');
    return result;
  };
}

// ============================================
// Admin Accounts
// ============================================

export function useAdminAccounts(options?: SWRConfiguration) {
  return useSWR<{ items: AdminAccountSummary[] }>(
    '/api/admin-accounts',
    () => api.getAdminAccounts(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateAdminAccount() {
  return async (payload: AdminAccountCreateInput) => {
    const result = await api.createAdminAccount(payload);
    await mutate('/api/admin-accounts');
    return result;
  };
}

export function useDisableAdminAccount() {
  return async (accountId: string) => {
    const result = await api.disableAdminAccount(accountId);
    await mutate('/api/admin-accounts');
    return result;
  };
}

// ============================================
// Manual Mutations
// ============================================

export function refreshSession() {
  return mutate('/api/session/me');
}

export function refreshAgents() {
  return mutate('/api/agents');
}

export function refreshAdminAccounts() {
  return mutate('/api/admin-accounts');
}

// ============================================
// Prefetch
// ============================================

export function prefetchAgents() {
  return mutate('/api/agents', api.getAgents(), false);
}

export function prefetchSession() {
  return mutate('/api/session/me', api.getSession(), false);
}

// ============================================
// Agent Tokens
// ============================================

export function useAgentTokens(agentId: string | null, options?: SWRConfiguration) {
  return useSWR<{ items: AgentToken[] }>(
    agentId ? `/api/agents/${agentId}/tokens` : null,
    () => agentId ? api.getAgentTokens(agentId) : { items: [] },
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateAgentToken() {
  return async (agentId: string, payload: AgentTokenCreateInput) => {
    const result = await api.createAgentToken(agentId, payload);
    await mutate(`/api/agents/${agentId}/tokens`);
    await mutate((key) => Array.isArray(key) && key[0] === AGENT_TOKENS_BULK_KEY);
    return result;
  };
}

export function useRevokeAgentToken() {
  return async (tokenId: string, agentId: string) => {
    const result = await api.revokeAgentToken(tokenId);
    await mutate(`/api/agents/${agentId}/tokens`);
    await mutate((key) => Array.isArray(key) && key[0] === AGENT_TOKENS_BULK_KEY);
    return result;
  };
}

// ============================================
// Bulk Operations
// ============================================

/**
 * 获取所有 Agent 及其 Tokens
 * 
 * 用于 tokens 页面展示完整数据
 */
export function useAgentsWithTokens(options?: SWRConfiguration) {
  const agentsQuery = useAgents(options);
  
  const agentIds = agentsQuery.data?.items.map(a => a.id) ?? [];
  const tokensQuery = useSWR<Record<string, AgentToken[]>>(
    agentIds.length > 0 ? [AGENT_TOKENS_BULK_KEY, ...agentIds] : null,
    async () => {
      const entries = await Promise.all(
        agentIds.map(async (agentId) => {
          const response = await api.getAgentTokens(agentId);
          return [agentId, response.items] as const;
        })
      );

      return Object.fromEntries(entries);
    },
    {
      ...swrConfig,
      ...options,
      revalidateOnFocus: false,
    }
  );
  
  return {
    agents: agentsQuery.data?.items ?? [],
    tokensByAgent: tokensQuery.data ?? {},
    isLoading: agentsQuery.isLoading || (agentIds.length > 0 && tokensQuery.isLoading),
    error: agentsQuery.error ?? tokensQuery.error ?? null,
    mutate: async () => {
      await Promise.all([
        agentsQuery.mutate(),
        tokensQuery.mutate(),
      ]);
    },
  };
}
