/**
 * API Client
 *
 * 统一导出所有 API 相关功能：
 * - 基础 HTTP 客户端 (apiFetch, ApiError)
 * - 所有 Domain API 函数
 * - 统一的 api 对象（向后兼容）
 *
 * 推荐使用方式：
 * ```typescript

 * import { api } from '@/lib/api';
 * const tasks = await api.getTasks();
 *

 * import { getTasks, createTask } from '@/domains/task';
 *

 * import { useTasks, useCreateTask } from '@/domains/task';
 * ```
 */

'use client';


export { apiFetch, ApiError } from './api-client';


export type {
  SetupOwnerInput,
  AgentCreateInput,
  AgentCreateResponse,
  AdminAccountCreateInput,
  LoginInput,
  AccessTokenCreateInput,
  AccessTokenCreateResponse,
  TaskCreateInput,
  TokenFeedbackCreateInput,
  AccessTokenFeedbackCreateInput,
} from './api-client';


export * from '@/domains/identity';
export * from '@/domains/task';
export * from '@/domains/governance';
export * from '@/domains/review';


import { identityApi, taskApi, governanceApi, reviewApi } from '@/domains';

/**
 * 统一的 API 对象，包含所有 domain 的 API 方法
 *
 * 注意：新项目推荐直接使用 domain imports 或 SWR hooks
 *
 * @example
 * ```typescript
 * import { api } from '@/lib/api';
 *

 * const agents = await api.getAgents();
 * const session = await api.getSession();
 *

 * const tasks = await api.getTasks();
 * await api.createTask({...});
 *

 * const reviews = await api.getReviews();
 * await api.approveReview(kind, id);
 * ```
 */
export const api = {
  ...identityApi,
  ...taskApi,
  ...governanceApi,
  ...reviewApi,
};
