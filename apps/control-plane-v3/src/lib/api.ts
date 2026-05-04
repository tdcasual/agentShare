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
 * // 方式1: 使用统一 api 对象（简单场景）
 * import { api } from '@/lib/api';
 * const tasks = await api.getTasks();
 *
 * // 方式2: 使用特定 domain API（推荐）
 * import { getTasks, createTask } from '@/domains/task';
 *
 * // 方式3: 使用 SWR Hooks（React 组件）
 * import { useTasks, useCreateTask } from '@/domains/task';
 * ```
 */

'use client';

// ============================================
// 基础客户端
// ============================================

export { apiFetch, ApiError } from './api-client';

// ============================================
// 类型定义
// ============================================

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

// ============================================
// Domain APIs
// ============================================

export * from '@/domains/identity';
export * from '@/domains/task';
export * from '@/domains/governance';
export * from '@/domains/review';

// ============================================
// 统一 API 对象（向后兼容）
// ============================================

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
 * // Identity
 * const agents = await api.getAgents();
 * const session = await api.getSession();
 *
 * // Task
 * const tasks = await api.getTasks();
 * await api.createTask({...});
 *
 * // Review
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
