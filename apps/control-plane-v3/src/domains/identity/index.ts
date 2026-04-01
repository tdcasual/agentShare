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
} from './types';

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
  getAdminAccounts,
  createAdminAccount,
  disableAdminAccount,
  getAgentTokens,
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
  refreshAdminAccounts,
  // Prefetch
  prefetchAgents,
  prefetchSession,
} from './hooks';
