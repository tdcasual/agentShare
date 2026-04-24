/**
 * Identity Domain Hooks
 *
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useCallback } from 'react';
import { swrConfig, staticConfig } from '@/lib/swr-config';
import * as api from './api';
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
} from './types';
import type { AccessToken } from '../shared-types';
import type { AdminAccountCreateInput, LoginInput, AccessTokenCreateInput } from '@/lib/api-client';
const ACCESS_TOKENS_KEY = '/api/access-tokens';

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
  return useCallback(async (payload: LoginInput) => {
    const result = await api.login(payload);
    await mutate('/api/session/me', result, false);
    return result;
  }, []);
}

export function useLogout() {
  return useCallback(async () => {
    const result = await api.logout();
    await mutate('/api/session/me', null, false);
    return result;
  }, []);
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

export function useOpenClawAgent(agentId: string | null, options?: SWRConfiguration) {
  const key = !agentId || options?.isPaused ? null : `/api/openclaw/agents/${agentId}`;

  return useSWR<OpenClawAgent>(key, () => api.getOpenClawAgent(agentId!), {
    ...swrConfig,
    ...options,
  });
}

export function useCreateOpenClawAgent() {
  return useCallback(async (payload: api.OpenClawAgentCreateInput) => {
    const result = await api.createOpenClawAgent(payload);
    await mutate('/api/openclaw/agents');
    return result;
  }, []);
}

export function useUpdateOpenClawAgent() {
  return useCallback(async (agentId: string, payload: api.OpenClawAgentUpdateInput) => {
    const result = await api.updateOpenClawAgent(agentId, payload);
    await mutate('/api/openclaw/agents');
    await mutate(`/api/openclaw/agents/${agentId}`);
    return result;
  }, []);
}

export function useDeleteOpenClawAgent() {
  return useCallback(async (agentId: string) => {
    const result = await api.deleteOpenClawAgent(agentId);
    await mutate('/api/openclaw/agents');
    await mutate('/api/openclaw/sessions');
    await mutate(`/api/openclaw/agents/${agentId}/files`, { items: [] }, false);
    return result;
  }, []);
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

export function useCreateOpenClawSession() {
  return useCallback(async (agentId: string, payload: OpenClawSessionCreateInput) => {
    const result = await api.createOpenClawSession(agentId, payload);
    await mutate('/api/openclaw/sessions');
    return result;
  }, []);
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

export function useRevokeOpenClawSession() {
  return useCallback(async (sessionId: string) => {
    const result = await api.revokeOpenClawSession(sessionId);
    await mutate('/api/openclaw/sessions');
    return result;
  }, []);
}

export function useAgentWorkbenchSessions(agentId: string | null, options?: SWRConfiguration) {
  return useSWR<{ items: WorkbenchSessionSummary[] }>(
    agentId ? `/api/openclaw/agents/${agentId}/workbench/sessions` : null,
    () => (agentId ? api.getAgentWorkbenchSessions(agentId) : { items: [] }),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateAgentWorkbenchSession() {
  return useCallback(async (agentId: string, payload: WorkbenchSessionCreateInput) => {
    const result = await api.createAgentWorkbenchSession(agentId, payload);
    await mutate(`/api/openclaw/agents/${agentId}/workbench/sessions`);
    return result;
  }, []);
}

export function useWorkbenchSession(conversationId: string | null, options?: SWRConfiguration) {
  const key = !conversationId || options?.isPaused ? null : `/api/openclaw/workbench/sessions/${conversationId}`;

  return useSWR<WorkbenchSessionSummary>(key, () => api.getWorkbenchSession(conversationId!), {
    ...swrConfig,
    ...options,
  });
}

export function useWorkbenchMessages(conversationId: string | null, options?: SWRConfiguration) {
  const key = !conversationId || options?.isPaused ? null : `/api/openclaw/workbench/sessions/${conversationId}/messages`;

  return useSWR<{ items: WorkbenchMessageSummary[] }>(key, () => api.getWorkbenchMessages(conversationId!), {
    ...swrConfig,
    ...options,
  });
}

export function useSendWorkbenchMessage() {
  return useCallback(async (conversationId: string, payload: WorkbenchMessageInput) => {
    const result = await api.sendWorkbenchMessage(conversationId, payload);
    await Promise.all([
      mutate(`/api/openclaw/workbench/sessions/${conversationId}/messages`),
      mutate(`/api/openclaw/agents/${result.session.agent_id}/workbench/sessions`),
    ]);
    return result;
  }, []);
}

export function usePauseOpenClawDreamRun() {
  return useCallback(async (runId: string, reason: string) => {
    const result = await api.pauseOpenClawDreamRun(runId, reason);
    await mutate('/api/openclaw/dream-runs');
    await mutate(`/api/openclaw/dream-runs/${runId}`);
    return result;
  }, []);
}

export function useResumeOpenClawDreamRun() {
  return useCallback(async (runId: string) => {
    const result = await api.resumeOpenClawDreamRun(runId);
    await mutate('/api/openclaw/dream-runs');
    await mutate(`/api/openclaw/dream-runs/${runId}`);
    return result;
  }, []);
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
  return useCallback(async (payload: AdminAccountCreateInput) => {
    const result = await api.createAdminAccount(payload);
    await mutate('/api/admin-accounts');
    return result;
  }, []);
}

export function useDisableAdminAccount() {
  return useCallback(async (accountId: string) => {
    const result = await api.disableAdminAccount(accountId);
    await mutate('/api/admin-accounts');
    return result;
  }, []);
}

// ============================================
// Access Tokens
// ============================================

export function useAccessTokens(options?: SWRConfiguration) {
  return useSWR<{ items: AccessToken[] }>(ACCESS_TOKENS_KEY, () => api.getAccessTokens(), {
    ...swrConfig,
    ...options,
  });
}

export function useCreateAccessToken() {
  return useCallback(async (payload: AccessTokenCreateInput) => {
    const result = await api.createAccessToken(payload);
    await mutate(ACCESS_TOKENS_KEY);
    return result;
  }, []);
}

export function useRevokeAccessToken() {
  return useCallback(async (tokenId: string) => {
    const result = await api.revokeAccessToken(tokenId);
    await mutate(ACCESS_TOKENS_KEY);
    return result;
  }, []);
}

// ============================================
// Manual Mutations
// ============================================

export function refreshSession() {
  return mutate('/api/session/me');
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

export function refreshAgentWorkbenchSessions(agentId: string) {
  return mutate(`/api/openclaw/agents/${agentId}/workbench/sessions`);
}

export function refreshWorkbenchMessages(conversationId: string) {
  return mutate(`/api/openclaw/workbench/sessions/${conversationId}/messages`);
}

export function refreshAccessTokens() {
  return mutate(ACCESS_TOKENS_KEY);
}

// ============================================
// Prefetch
// ============================================

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

export function prefetchAccessTokens() {
  return mutate(ACCESS_TOKENS_KEY, api.getAccessTokens(), false);
}
