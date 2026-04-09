/**
 * Identity Domain
 *
 * 导出：
 * - 类型定义
 * - API 函数
 * - React Hooks
 */

// Types
export type {
  Identity,
  Agent,
  IdentityType,
  IdentityStatus,
  PresenceStatus,
  IdentityProfile,
  IdentityStats,
  IdentityCapabilities,
  IdentityRuntime,
  IdentitySession,
  IdentityCredentials,
  IdentityRelationships,
  IdentityReference,
  IdentityEvents,
  CreateIdentityInput,
  UpdateIdentityInput,
  IdentityQuery,
  BootstrapStatus,
  ManagementSessionSummary,
  AdminAccountSummary,
  OpenClawAgentSummary,
  OpenClawSessionSummary,
  OpenClawAgentFileSummary,
  OpenClawDreamPolicy,
  OpenClawDreamRunSummary,
  OpenClawDreamRunDetail,
  OpenClawDreamStepSummary,
  OpenClawAgent,
  OpenClawSession,
  OpenClawAgentFile,
  OpenClawDreamRun,
  OpenClawDreamStep,
} from './types';

// Re-export AgentToken from task domain for convenience
export type { AgentToken } from '@/domains/task/types';

// API
export {
  identityApi,
  getBootstrapStatus,
  setupOwner,
  login,
  logout,
  getSession,
  getAgents,
  createAgent,
  deleteAgent,
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
  getAdminAccounts,
  createAdminAccount,
  disableAdminAccount,
  getAgentTokens,
  getAgentTokensBulk,
  createAgentToken,
  revokeAgentToken,
} from './api';

// Hooks
export {
  // Bootstrap
  useBootstrapStatus,
  // Session
  useSession,
  useLogin,
  useLogout,
  // Agents
  useAgents,
  useCreateAgent,
  useDeleteAgent,
  useOpenClawAgents,
  useCreateOpenClawAgent,
  useUpdateOpenClawAgent,
  useDeleteOpenClawAgent,
  useOpenClawSessions,
  useOpenClawDreamRuns,
  useOpenClawDreamRun,
  useOpenClawFiles,
  usePauseOpenClawDreamRun,
  useResumeOpenClawDreamRun,
  // Admin Accounts
  useAdminAccounts,
  useCreateAdminAccount,
  useDisableAdminAccount,
  // Agent Tokens
  useAgentTokens,
  useCreateAgentToken,
  useRevokeAgentToken,
  // Bulk Operations
  useAgentsWithTokens,
  // Manual mutations
  refreshSession,
  refreshAgents,
  refreshOpenClawAgents,
  refreshAdminAccounts,
  refreshAgentsWithTokens,
  refreshOpenClawSessions,
  refreshOpenClawDreamRuns,
  // Prefetch
  prefetchAgents,
  prefetchSession,
  prefetchOpenClawAgents,
  prefetchOpenClawSessions,
  prefetchOpenClawDreamRuns,
} from './hooks';
