/**
 * Identity Domain Hooks
 *
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { swrConfig, staticConfig } from '@/lib/swr-config';
import * as api from './api';
import type {
  Agent,
  BootstrapStatus,
  ManagementSessionSummary,
  AdminAccountSummary,
  OpenClawAgent,
  OpenClawAgentFile,
  OpenClawDreamRunDetail,
  OpenClawDreamRun,
  OpenClawSession,
} from './types';
import type { AgentToken } from '../task/types';
import type {
  AgentCreateInput,
  AdminAccountCreateInput,
  LoginInput,
  AgentTokenCreateInput,
} from '@/lib/api-client';

const AGENT_TOKENS_BULK_KEY = 'bulk:agent-tokens';

// ============================================
// Bootstrap
// ============================================

export function useBootstrapStatus(options?: SWRConfiguration) {
  return useSWR<BootstrapStatus>('/api/bootstrap/status', () => api.getBootstrapStatus(), {
    ...staticConfig,
    ...options,
  });
}

// ============================================
// Session
// ============================================

export function useSession(options?: SWRConfiguration) {
  return useSWR<ManagementSessionSummary>('/api/session/me', () => api.getSession(), {
    ...swrConfig,
    ...options,
  });
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
    options?.isPaused ? null : '/api/agents',
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

export function useDeleteAgent() {
  return async (agentId: string) => {
    const result = await api.deleteAgent(agentId);
    await mutate('/api/agents');
    await mutate(`/api/agents/${agentId}/tokens`, { items: [] }, false);
    await mutate((key) => Array.isArray(key) && key[0] === AGENT_TOKENS_BULK_KEY);
    return result;
  };
}

export function useOpenClawAgents(options?: SWRConfiguration) {
  return useSWR<{ items: OpenClawAgent[] }>(
    options?.isPaused ? null : '/api/openclaw/agents',
    () => api.getOpenClawAgents(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateOpenClawAgent() {
  return async (payload: api.OpenClawAgentCreateInput) => {
    const result = await api.createOpenClawAgent(payload);
    await mutate('/api/openclaw/agents');
    return result;
  };
}

export function useUpdateOpenClawAgent() {
  return async (agentId: string, payload: api.OpenClawAgentUpdateInput) => {
    const result = await api.updateOpenClawAgent(agentId, payload);
    await mutate('/api/openclaw/agents');
    await mutate(`/api/openclaw/agents/${agentId}`);
    return result;
  };
}

export function useDeleteOpenClawAgent() {
  return async (agentId: string) => {
    const result = await api.deleteOpenClawAgent(agentId);
    await mutate('/api/openclaw/agents');
    await mutate('/api/openclaw/sessions');
    await mutate(`/api/openclaw/agents/${agentId}/files`, { items: [] }, false);
    return result;
  };
}

export function useOpenClawSessions(options?: SWRConfiguration) {
  return useSWR<{ items: OpenClawSession[] }>(
    options?.isPaused ? null : '/api/openclaw/sessions',
    () => api.getOpenClawSessions(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useOpenClawDreamRuns(options?: SWRConfiguration) {
  return useSWR<{ items: OpenClawDreamRun[] }>(
    options?.isPaused ? null : '/api/openclaw/dream-runs',
    () => api.getOpenClawDreamRuns(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useOpenClawDreamRun(runId: string | null, options?: SWRConfiguration) {
  const key = !runId || options?.isPaused ? null : `/api/openclaw/dream-runs/${runId}`;

  return useSWR<OpenClawDreamRunDetail>(key, () => api.getOpenClawDreamRun(runId!), {
    ...swrConfig,
    ...options,
  });
}

export function useOpenClawFiles(agentId: string | null, options?: SWRConfiguration) {
  return useSWR<{ items: OpenClawAgentFile[] }>(
    agentId ? `/api/openclaw/agents/${agentId}/files` : null,
    () => (agentId ? api.getOpenClawFiles(agentId) : { items: [] }),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function usePauseOpenClawDreamRun() {
  return async (runId: string, reason: string) => {
    const result = await api.pauseOpenClawDreamRun(runId, reason);
    await mutate('/api/openclaw/dream-runs');
    await mutate(`/api/openclaw/dream-runs/${runId}`);
    return result;
  };
}

export function useResumeOpenClawDreamRun() {
  return async (runId: string) => {
    const result = await api.resumeOpenClawDreamRun(runId);
    await mutate('/api/openclaw/dream-runs');
    await mutate(`/api/openclaw/dream-runs/${runId}`);
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

export function refreshOpenClawAgents() {
  return mutate('/api/openclaw/agents');
}

export function refreshAdminAccounts() {
  return mutate('/api/admin-accounts');
}

export function refreshOpenClawSessions() {
  return mutate('/api/openclaw/sessions');
}

export function refreshOpenClawDreamRuns() {
  return mutate('/api/openclaw/dream-runs');
}

export function refreshAgentsWithTokens() {
  // 刷新 agents 列表
  return mutate('/api/agents').then(() => {
    // 刷新 bulk tokens 缓存
    return mutate((key) => Array.isArray(key) && key[0] === AGENT_TOKENS_BULK_KEY);
  });
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

export function prefetchOpenClawAgents() {
  return mutate('/api/openclaw/agents', api.getOpenClawAgents(), false);
}

export function prefetchOpenClawSessions() {
  return mutate('/api/openclaw/sessions', api.getOpenClawSessions(), false);
}

export function prefetchOpenClawDreamRuns() {
  return mutate('/api/openclaw/dream-runs', api.getOpenClawDreamRuns(), false);
}

// ============================================
// Agent Tokens
// ============================================

export function useAgentTokens(agentId: string | null, options?: SWRConfiguration) {
  return useSWR<{ items: AgentToken[] }>(
    agentId ? `/api/agents/${agentId}/tokens` : null,
    () => (agentId ? api.getAgentTokens(agentId) : { items: [] }),
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

  const agentIds = agentsQuery.data?.items.map((a) => a.id) ?? [];
  const tokensQuery = useSWR<Record<string, AgentToken[]>>(
    options?.isPaused || agentIds.length === 0 ? null : [AGENT_TOKENS_BULK_KEY, ...agentIds],
    async () => (await api.getAgentTokensBulk(agentIds)).items_by_agent,
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
      await Promise.all([agentsQuery.mutate(), tokensQuery.mutate()]);
    },
  };
}
