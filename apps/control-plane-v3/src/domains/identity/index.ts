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

// Re-export AccessToken from task domain for convenience
export type { AccessToken } from '@/domains/task/types';

// API
export {
  identityApi,
  getBootstrapStatus,
  setupOwner,
  login,
  logout,
  getSession,
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
  getAccessTokens,
  createAccessToken,
  revokeAccessToken,
} from './api';

// Hooks
export {
  // Bootstrap
  useBootstrapStatus,
  // Session
  useSession,
  useLogin,
  useLogout,
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
  useAccessTokens,
  useCreateAccessToken,
  useRevokeAccessToken,
  // Manual mutations
  refreshSession,
  refreshOpenClawAgents,
  refreshAdminAccounts,
  refreshAccessTokens,
  refreshOpenClawSessions,
  refreshOpenClawDreamRuns,
  // Prefetch
  prefetchSession,
  prefetchOpenClawAgents,
  prefetchOpenClawSessions,
  prefetchOpenClawDreamRuns,
  prefetchAccessTokens,
} from './hooks';
