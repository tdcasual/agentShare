/**
 * Task 领域类型定义
 * 
 * 包含：
 * - Task 实体
 * - Run 实体
 * - Token 相关类型
 * - Task 领域事件
 */

import { IdentityReference } from '../identity/types';

// ============================================
// 基础类型
// ============================================

export type TaskStatus = 'pending' | 'claimed' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type PublicationStatus = 'draft' | 'active' | 'paused' | 'archived';
export type TaskTargetMode = 'explicit_tokens' | 'broadcast';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type FeedbackVerdict = 'accepted' | 'rejected' | 'needs_improvement';

// ============================================
// 值对象
// ============================================

export interface TaskInput {
  readonly [key: string]: unknown;
}

export interface TaskTarget {
  readonly id: string;
  readonly tokenId: string;
  readonly status: RunStatus;
}

// ============================================
// 实体: Task
// ============================================

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly taskType: string;
  readonly task_type?: string;  // API 返回 snake_case
  readonly description?: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly publicationStatus: PublicationStatus;
  readonly publication_status?: string;  // API 返回 snake_case
  readonly targetMode: TaskTargetMode;
  readonly target_mode?: string;  // API 返回 snake_case
  readonly input: TaskInput;
  readonly targetIds: string[];
  readonly targetTokenIds: string[];
  readonly target_ids?: string[];  // API 返回 snake_case
  readonly target_token_ids?: string[];  // API 返回 snake_case
  readonly createdBy: IdentityReference;
  readonly created_by_actor_type?: string;  // API 返回 snake_case
  readonly created_by_actor_id?: string;  // API 返回 snake_case
  readonly created_via_token_id?: string;  // API 返回 snake_case
  readonly claimedBy?: string;
  readonly claimed_by?: string;  // API 返回 snake_case
  readonly createdAt: string;
  readonly created_at?: string;  // API 返回 snake_case
  readonly updatedAt: string;
  readonly updated_at?: string;  // API 返回 snake_case
  readonly publishedAt?: string;
  readonly completedAt?: string;
}

// ============================================
// 实体: Run
// ============================================

export interface Run {
  readonly id: string;
  readonly taskId: string;
  readonly task_id?: string;  // API 返回 snake_case
  readonly targetId: string;
  readonly task_target_id?: string;  // API 返回 snake_case
  readonly tokenId: string;
  readonly token_id?: string;  // API 返回 snake_case
  readonly status: RunStatus;
  readonly result?: unknown;
  readonly resultSummary?: string;
  readonly result_summary?: string;  // API 返回 snake_case
  readonly errorMessage?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
}

// ============================================
// 实体: Token Feedback
// ============================================

export interface TokenFeedback {
  readonly id: string;
  readonly taskId: string;
  readonly targetId: string;
  readonly task_target_id?: string;  // API 返回 snake_case
  readonly tokenId: string;
  readonly score: number;
  readonly verdict: FeedbackVerdict;
  readonly summary: string;
  readonly createdBy: IdentityReference;
  readonly createdAt: string;
}

// ============================================
// 实体: Agent Token
// ============================================

export interface AgentToken {
  readonly id: string;
  readonly agentId: string;
  readonly agent_id?: string;  // API 返回 snake_case
  readonly displayName: string;
  readonly display_name?: string;  // API 返回 snake_case
  readonly tokenPrefix: string;
  readonly token_prefix?: string;  // API 返回 snake_case
  readonly trustScore: number;
  readonly trust_score?: number;  // API 返回 snake_case
  readonly riskTier: string;
  readonly authMethod: string;
  readonly status: string;
  readonly scopes?: string[];
  readonly labels?: Record<string, string>;
  readonly expiresAt?: string;
  readonly lastUsedAt?: string;
  readonly last_used_at?: string;  // API 返回 snake_case
  readonly last_feedback_at?: string;  // API 返回 snake_case
  readonly success_rate?: number;  // API 返回 snake_case
  readonly completed_runs?: number;  // API 返回 snake_case
  readonly successful_runs?: number;  // API 返回 snake_case
  readonly issued_by_actor_id?: string;  // API 返回 snake_case
  readonly createdAt: string;
}

// ============================================
// 领域事件
// ============================================

export interface TaskEvents {
  'task:created': {
    readonly task: Task;
  };
  'task:updated': {
    readonly taskId: string;
    readonly changes: Partial<Task>;
  };
  'task:claimed': {
    readonly taskId: string;
    readonly agentId: string;
  };
  'task:completed': {
    readonly taskId: string;
    readonly run: Run;
  };
  'task:failed': {
    readonly taskId: string;
    readonly error: string;
  };
  'run:started': {
    readonly run: Run;
  };
  'run:completed': {
    readonly run: Run;
  };
  'feedback:created': {
    readonly feedback: TokenFeedback;
  };
}

// ============================================
// DTOs
// ============================================

export interface CreateTaskInput {
  readonly title: string;
  readonly taskType: string;
  readonly description?: string;
  readonly priority: TaskPriority;
  readonly input: TaskInput;
  readonly targetMode: TaskTargetMode;
  readonly targetTokenIds: string[];
}

export interface CreateFeedbackInput {
  readonly score: number;
  readonly verdict: FeedbackVerdict;
  readonly summary: string;
}

// ============================================
// 视图模型
// ============================================

export interface TaskWithTargets extends Task {
  readonly targets: TaskTargetView[];
}

export interface TaskTargetView {
  readonly targetId: string;
  readonly tokenId: string;
  readonly token: AgentToken | null;
  readonly run: Run | null;
  readonly feedback: TokenFeedback[];
  readonly status: RunStatus;
}

// ============================================
// 查询参数
// ============================================

export interface TaskQuery {
  readonly status?: TaskStatus;
  readonly priority?: TaskPriority;
  readonly taskType?: string;
  readonly createdBy?: string;
  readonly claimedBy?: string;
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
}
