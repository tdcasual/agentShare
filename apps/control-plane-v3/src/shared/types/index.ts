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

// Asset domain types removed - domain is being deprecated

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
// Asset domain removed
import type { ReviewEvents } from '@/domains/review/types';

// 合并所有领域事件
export type DomainEvents = IdentityEvents & TaskEvents & ReviewEvents;

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

// ============================================
// Management Session Types
// ============================================

// 从 identity domain 重新导出，避免重复定义
export type { ManagementSessionSummary } from '@/domains/identity/types';

import type { ManagementSessionSummary } from '@/domains/identity/types';

/**
 * 前端使用的Domain Model
 * 使用 camelCase 和 Date 对象
 */
export interface ManagementSession {
  readonly actorId: string;
  readonly actorType: string;
  readonly sessionId: string;
  readonly email: string;
  readonly role: string;
  readonly authMethod: string;
  readonly expiresIn: number;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}

// Session转换函数
export function toManagementSession(dto: ManagementSessionSummary): ManagementSession {
  return {
    actorId: dto.actor_id,
    actorType: dto.actor_type,
    sessionId: dto.session_id,
    email: dto.email,
    role: dto.role,
    authMethod: dto.auth_method,
    expiresIn: dto.expires_in,
    issuedAt: new Date(dto.issued_at * 1000),
    expiresAt: new Date(dto.expires_at * 1000),
  };
}

export function toManagementSessionDTO(model: ManagementSession): Omit<ManagementSessionSummary, 'status' | 'auth_method' | 'expires_in'> & { issued_at: number; expires_at: number } {
  return {
    actor_id: model.actorId,
    actor_type: model.actorType,
    session_id: model.sessionId,
    email: model.email,
    role: model.role as 'viewer' | 'operator' | 'admin' | 'owner',
    issued_at: Math.floor(model.issuedAt.getTime() / 1000),
    expires_at: Math.floor(model.expiresAt.getTime() / 1000),
  };
}

// ============================================
// 弃用警告（开发时提示）
// ============================================



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
