/**
 * Shared Types - 共享类型
 * 
 * 注意：类型已按领域拆分，此文件仅保留：
 * 1. 基础设施类型
 * 2. 跨领域共享类型
 * 3. 向后兼容的重新导出
 */

// ============================================
// 从领域类型重新导出（向后兼容）
// ============================================

export type {
  Identity,
  IdentityType,
  IdentityStatus,
  PresenceStatus,
  IdentityProfile,
  IdentityStats,
  IdentityReference,
  IdentityEvents,
  CreateIdentityInput,
  UpdateIdentityInput,
  IdentityQuery,
} from '@/domains/identity/types';

export type {
  Task,
  TaskStatus,
  TaskPriority,
  PublicationStatus,
  TaskTargetMode,
  Run,
  RunStatus,
  TokenFeedback,
  FeedbackVerdict,
  AgentToken,
  TaskInput,
  TaskTarget,
  TaskEvents,
  CreateTaskInput,
  CreateFeedbackInput,
  TaskWithTargets,
  TaskTargetView,
} from '@/domains/task/types';

export type {
  Asset,
  AssetType,
  AssetVisibility,
  AssetStatus,
  AssetMetadata,
  AssetReview,
  AssetEvents,
  CreateAssetInput,
  UpdateAssetInput,
} from '@/domains/asset/types';

export type {
  ReviewQueueItem,
  ReviewResourceKind,
  ReviewDecision,
  ReviewEvents,
  ApproveReviewInput,
  RejectReviewInput,
  ReviewQuery,
} from '@/domains/review/types';

// ============================================
// 基础设施类型
// ============================================

export type Disposable = () => void;

export interface PaginationParams {
  readonly limit?: number;
  readonly offset?: number;
}

export interface PaginatedResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

// ============================================
// 共享领域事件（跨领域）
// ============================================

import type { IdentityEvents } from '@/domains/identity/types';
import type { TaskEvents } from '@/domains/task/types';
import type { AssetEvents } from '@/domains/asset/types';
import type { ReviewEvents } from '@/domains/review/types';

// 合并所有领域事件
export type DomainEvents = IdentityEvents & TaskEvents & AssetEvents & ReviewEvents;

// ============================================
// 向后兼容的别名
// ============================================

// 身份相关别名（向后兼容）
export type HumanIdentity = import('@/domains/identity/types').Identity;
export type AgentIdentity = import('@/domains/identity/types').Identity;

// 任务相关别名
export type TaskSummary = import('@/domains/task/types').Task;
export type RunSummary = import('@/domains/task/types').Run;
export type TokenFeedbackSummary = import('@/domains/task/types').TokenFeedback;
export type AgentTokenSummary = import('@/domains/task/types').AgentToken;

// 资产相关别名
export type AssetSummary = import('@/domains/asset/types').Asset;

// 输入类型别名
export type TaskCreateInput = import('@/domains/task/types').CreateTaskInput;
export type TokenFeedbackCreateInput = import('@/domains/task/types').CreateFeedbackInput;

// 其他共享类型
export interface AgentSummary {
  readonly id: string;
  readonly name: string;
  readonly risk_tier: string;
  readonly auth_method: string;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AdminAccountSummary {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly role: 'viewer' | 'operator' | 'admin' | 'owner';
  readonly status?: string;
  readonly is_active?: boolean;
  readonly created_at: string;
  readonly last_login_at?: string;
}

export interface BootstrapStatus {
  readonly initialized: boolean;
  readonly bootstrapped?: boolean;
  readonly has_valid_bootstrap_key?: boolean;
  readonly setup_required?: boolean;
}

export interface ManagementSessionSummary {
  readonly id: string;
  readonly session_id?: string;
  readonly account_id?: string;
  readonly actor_id?: string;
  readonly identity_id?: string;
  readonly email?: string;
  readonly role: string;
  readonly status: string;
  readonly created_at: string;
  readonly expires_at: string | number;
}

// ============================================
// 弃用警告（开发时提示）
// ============================================

// 这些类型将在 v2.0 中移除，请直接使用领域类型
/** @deprecated 使用 AssetType 替代 */
export type AssetKind = import('@/domains/asset/types').AssetType;

// ============================================
// 公共枚举
// ============================================

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'critical'] as const;
export const TASK_STATUSES = ['pending', 'claimed', 'completed', 'failed', 'cancelled'] as const;
export const IDENTITY_TYPES = ['human', 'agent'] as const;
export const PRESENCE_STATUSES = ['online', 'away', 'busy', 'offline'] as const;

// ============================================
// 类型守卫
// ============================================

import type { IdentityType } from '@/domains/identity/types';
import type { TaskPriority, TaskStatus } from '@/domains/task/types';

export function isIdentityType(value: string): value is IdentityType {
  return ['human', 'agent'].includes(value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return ['low', 'normal', 'high', 'critical'].includes(value);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return ['pending', 'claimed', 'completed', 'failed', 'cancelled'].includes(value);
}
