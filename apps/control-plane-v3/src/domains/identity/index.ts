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
  OpenClawSessionCreateInput,
  OpenClawAgentFile,
  OpenClawDreamRun,
  OpenClawDreamStep,
  WorkbenchSessionSummary,
  WorkbenchMessageSummary,
  WorkbenchSessionCreateInput,
  WorkbenchMessageInput,
  WorkbenchMessageCreateResponse,
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
  useOpenClawAgent,
  useCreateOpenClawAgent,
  useUpdateOpenClawAgent,
  useDeleteOpenClawAgent,
  useOpenClawSessions,
  useCreateOpenClawSession,
  useOpenClawDreamRuns,
  useOpenClawDreamRun,
  useOpenClawFiles,
  usePauseOpenClawDreamRun,
  useResumeOpenClawDreamRun,
  useRevokeOpenClawSession,
  useAgentWorkbenchSessions,
  useCreateAgentWorkbenchSession,
  useWorkbenchSession,
  useWorkbenchMessages,
  useSendWorkbenchMessage,
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
  refreshAgentWorkbenchSessions,
  refreshWorkbenchMessages,
  // Prefetch
  prefetchSession,
  prefetchOpenClawAgents,
  prefetchOpenClawSessions,
  prefetchOpenClawDreamRuns,
  prefetchAccessTokens,
} from './hooks';
