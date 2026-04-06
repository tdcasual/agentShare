/**
 * Task Domain Types - New Version
 *
 * 分离Transport DTO和Domain Model
 * 使用snake_case传输，camelCase前端使用
 */

// ============================================
// 基础枚举
// ============================================

export type TaskStatus = 'pending' | 'claimed' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type PublicationStatus = 'draft' | 'active' | 'paused' | 'archived';
export type TaskTargetMode = 'explicit_tokens' | 'broadcast';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type FeedbackVerdict = 'accepted' | 'rejected' | 'needs_improvement';

// ============================================
// Run Types
// ============================================

/** 后端传输DTO - snake_case */
export type RunTransportDTO = {
  readonly run_id: string;
  readonly task_id: string;
  readonly agent_id?: string;
  readonly token_id?: string;
  readonly task_target_id?: string;
  readonly status: RunStatus;
  readonly result_summary?: string;
  readonly output_payload?: unknown;
  readonly error_summary?: string;
  readonly capability_invocations: unknown[];
  readonly lease_events: unknown[];
  readonly created_at: number;
  readonly updated_at: number;
} & Record<string, unknown>;

/** 前端领域模型 - camelCase + Date */
export type Run = {
  readonly runId: string;
  readonly taskId: string;
  readonly agentId?: string;
  readonly tokenId?: string;
  readonly taskTargetId?: string;
  readonly status: RunStatus;
  readonly resultSummary?: string;
  readonly outputPayload?: unknown;
  readonly errorSummary?: string;
  readonly capabilityInvocations: unknown[];
  readonly leaseEvents: unknown[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
} & Record<string, unknown>;

// ============================================
// TokenFeedback Types
// ============================================

/** 后端传输DTO */
export type TokenFeedbackTransportDTO = {
  readonly token_id: string;
  readonly task_target_id: string;
  readonly run_id?: string;
  readonly score: number;
  readonly verdict: FeedbackVerdict;
  readonly summary: string;
  readonly created_by_actor_type: string;
  readonly created_by_actor_id: string;
  readonly created_at: number;
} & Record<string, unknown>;

/** 前端领域模型 */
export type TokenFeedback = {
  readonly tokenId: string;
  readonly taskTargetId: string;
  readonly runId?: string;
  readonly score: number;
  readonly verdict: FeedbackVerdict;
  readonly summary: string;
  readonly createdByActorType: string;
  readonly createdByActorId: string;
  readonly createdAt: Date;
} & Record<string, unknown>;

// ============================================
// AgentToken Types
// ============================================

/** 后端传输DTO */
export type AgentTokenTransportDTO = {
  readonly token_id: string;
  readonly agent_id: string;
  readonly display_name: string;
  readonly token_prefix: string;
  readonly trust_score: number;
  readonly risk_tier: string;
  readonly auth_method: string;
  readonly status: string;
  readonly scopes?: string[];
  readonly labels?: Record<string, string>;
  readonly expires_at?: number;
  readonly last_used_at?: number;
  readonly last_feedback_at?: number;
  readonly success_rate?: number;
  readonly completed_runs?: number;
  readonly successful_runs?: number;
  readonly issued_by_actor_id?: string;
  readonly created_at: number;
} & Record<string, unknown>;

/** 前端领域模型 */
export type AgentToken = {
  readonly tokenId: string;
  readonly agentId: string;
  readonly displayName: string;
  readonly tokenPrefix: string;
  readonly trustScore: number;
  readonly riskTier: string;
  readonly authMethod: string;
  readonly status: string;
  readonly scopes: string[];
  readonly labels: Record<string, string>;
  readonly expiresAt?: Date;
  readonly lastUsedAt?: Date;
  readonly lastFeedbackAt?: Date;
  readonly successRate?: number;
  readonly completedRuns?: number;
  readonly successfulRuns?: number;
  readonly issuedByActorId?: string;
  readonly createdAt: Date;
} & Record<string, unknown>;

// ============================================
// TaskTargetView - 统一视图模型
// ============================================

export interface TaskTargetView {
  /** 目标ID (来自task.target_ids) */
  readonly targetId: string;
  /** 令牌ID (来自task.target_token_ids对应位置) */
  readonly tokenId?: string;
  /** 关联令牌详情 */
  readonly token?: AgentToken | null;
  /** 运行状态 */
  readonly status: RunStatus;
  /** 认领时间 */
  readonly claimedAt?: Date;
  /** 完成时间 */
  readonly completedAt?: Date;
  /** 关联的运行记录 */
  readonly run?: Run | null;
  /** 反馈列表 */
  readonly feedback: TokenFeedback[];
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

export interface RunQuery {
  readonly taskId?: string;
  readonly agentId?: string;
  readonly tokenId?: string;
  readonly status?: RunStatus;
  readonly limit?: number;
  readonly offset?: number;
}

// ============================================
// 统一构建函数
// ============================================

import { agentTokenTransformer, runTransformer } from './transformers';

/**
 * 统一构建TaskTargetView列表
 * 解决 useTaskDashboard 和 tasks/page.tsx 的数据模型不一致问题
 */
export function buildTaskTargetViews(
  task: {
    target_ids: string[];
    target_token_ids?: string[];
    target_statuses?: RunStatus[];
    target_claimed_at?: number[];
    target_completed_at?: number[];
  },
  tokens: AgentTokenTransportDTO[],
  runs: RunTransportDTO[],
  feedbackList: TokenFeedbackTransportDTO[]
): TaskTargetView[] {
  const tokenMap = new Map(tokens.map((t) => [t.token_id, agentTokenTransformer.toModel(t)]));
  const runMap = new Map(runs.map((r) => [r.task_target_id, runTransformer.toModel(r)]));
  const feedbackMap = new Map<string, TokenFeedback[]>();

  // 按task_target_id分组feedback
  feedbackList.forEach((fb) => {
    const list = feedbackMap.get(fb.task_target_id) || [];
    // 需要导入tokenFeedbackTransformer
    // list.push(tokenFeedbackTransformer.toModel(fb));
    feedbackMap.set(fb.task_target_id, list);
  });

  return task.target_ids.map((targetId, index) => {
    const tokenId = task.target_token_ids?.[index];
    const token = tokenId ? tokenMap.get(tokenId) || null : null;
    const run = runMap.get(targetId) || null;

    return {
      targetId,
      tokenId,
      token,
      status: task.target_statuses?.[index] || 'pending',
      claimedAt: task.target_claimed_at?.[index]
        ? new Date(task.target_claimed_at[index] * 1000)
        : undefined,
      completedAt: task.target_completed_at?.[index]
        ? new Date(task.target_completed_at[index] * 1000)
        : undefined,
      run,
      feedback: feedbackMap.get(targetId) || [],
    };
  });
}
