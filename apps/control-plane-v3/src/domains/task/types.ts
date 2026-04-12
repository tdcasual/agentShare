/**
 * Task 领域类型定义
 *
 * 包含：
 * - Task 实体
 * - Run 实体
 * - Token 相关类型
 * - Task 领域事件
 */

import type { IdentityReference, AgentToken } from '../shared-types';

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
// 传输 DTO
// ============================================

export interface TaskTransport {
  readonly id: string;
  readonly title: string;
  readonly task_type: string;
  readonly description?: string;
  readonly priority?: TaskPriority;
  readonly status?: TaskStatus;
  readonly publication_status?: PublicationStatus;
  readonly target_mode?: TaskTargetMode;
  readonly input?: TaskInput;
  readonly target_ids?: string[];
  readonly target_token_ids?: string[];
  readonly required_capability_ids?: string[];
  readonly playbook_ids?: string[];
  readonly lease_allowed?: boolean;
  readonly approval_mode?: string | null;
  readonly approval_rules?: Array<Record<string, unknown>> | null;
  readonly created_by_actor_type?: string | null;
  readonly created_by_actor_id?: string | null;
  readonly created_via_token_id?: string | null;
  readonly claimed_by?: string | null;
}

export interface RunTransport {
  readonly id: string;
  readonly task_id: string;
  readonly agent_id?: string | null;
  readonly token_id?: string | null;
  readonly task_target_id?: string | null;
  readonly status: RunStatus;
  readonly result_summary?: string | null;
  readonly output_payload?: unknown;
  readonly error_summary?: string | null;
  readonly capability_invocations?: unknown;
  readonly lease_events?: unknown;
}

export interface TokenFeedbackTransport {
  readonly id: string;
  readonly token_id: string;
  readonly task_target_id: string;
  readonly run_id?: string | null;
  readonly source?: string | null;
  readonly score: number;
  readonly verdict: FeedbackVerdict;
  readonly summary: string;
  readonly created_by_actor_type?: string | null;
  readonly created_by_actor_id?: string | null;
  readonly created_at?: string | null;
}

export type { AgentTokenTransport, AgentToken } from '../shared-types';
export { normalizeAgentToken } from '../shared-types';

// ============================================
// 实体: Task
// ============================================

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly taskType: string;
  readonly description?: string;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly publicationStatus: PublicationStatus;
  readonly targetMode: TaskTargetMode;
  readonly input: TaskInput;
  readonly targetIds: string[];
  readonly targetTokenIds: string[];
  readonly requiredCapabilityIds: string[];
  readonly playbookIds: string[];
  readonly leaseAllowed: boolean;
  readonly approvalMode?: string | null;
  readonly approvalRules: Array<Record<string, unknown>>;
  readonly createdBy: IdentityReference;
  readonly createdViaTokenId?: string | null;
  readonly claimedBy?: string;
}

// ============================================
// 实体: Run - 与后端 /api/runs 返回对齐
// ============================================

export interface Run {
  readonly id: string;
  readonly taskId: string;
  readonly agentId?: string;
  readonly tokenId?: string;
  readonly taskTargetId?: string;
  readonly status: RunStatus;
  readonly resultSummary?: string;
  readonly outputPayload?: unknown;
  readonly errorSummary?: string;
  readonly capabilityInvocations?: unknown;
  readonly leaseEvents?: unknown;
}

// ============================================
// 实体: Token Feedback
// ============================================

export interface TokenFeedback {
  readonly id: string;
  readonly tokenId: string;
  readonly taskTargetId: string;
  readonly runId?: string;
  readonly source?: string;
  readonly score: number;
  readonly verdict: FeedbackVerdict;
  readonly summary: string;
  readonly createdBy: IdentityReference;
  readonly createdAt?: string;
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

function normalizeIdentityReference(
  actorType: string | null | undefined,
  actorId: string | null | undefined
): IdentityReference {
  const normalizedType = actorType === 'agent' ? 'agent' : 'human';
  const normalizedId = actorId ?? 'unknown';
  return {
    id: normalizedId,
    type: normalizedType,
    name: normalizedId,
  };
}

export function normalizeTask(dto: TaskTransport): Task {
  return {
    id: dto.id,
    title: dto.title,
    taskType: dto.task_type,
    description: dto.description,
    priority: dto.priority ?? 'normal',
    status: dto.status ?? 'pending',
    publicationStatus: dto.publication_status ?? 'draft',
    targetMode: dto.target_mode ?? 'explicit_tokens',
    input: dto.input ?? {},
    targetIds: dto.target_ids ?? [],
    targetTokenIds: dto.target_token_ids ?? [],
    requiredCapabilityIds: dto.required_capability_ids ?? [],
    playbookIds: dto.playbook_ids ?? [],
    leaseAllowed: dto.lease_allowed ?? false,
    approvalMode: dto.approval_mode,
    approvalRules: dto.approval_rules ?? [],
    createdBy: normalizeIdentityReference(dto.created_by_actor_type, dto.created_by_actor_id),
    createdViaTokenId: dto.created_via_token_id,
    claimedBy: dto.claimed_by ?? undefined,
  };
}

export function normalizeRun(dto: RunTransport): Run {
  return {
    id: dto.id,
    taskId: dto.task_id,
    agentId: dto.agent_id ?? undefined,
    tokenId: dto.token_id ?? undefined,
    taskTargetId: dto.task_target_id ?? undefined,
    status: dto.status,
    resultSummary: dto.result_summary ?? undefined,
    outputPayload: dto.output_payload,
    errorSummary: dto.error_summary ?? undefined,
    capabilityInvocations: dto.capability_invocations,
    leaseEvents: dto.lease_events,
  };
}

export function normalizeTokenFeedback(dto: TokenFeedbackTransport): TokenFeedback {
  return {
    id: dto.id,
    tokenId: dto.token_id,
    taskTargetId: dto.task_target_id,
    runId: dto.run_id ?? undefined,
    source: dto.source ?? undefined,
    score: dto.score,
    verdict: dto.verdict,
    summary: dto.summary,
    createdBy: normalizeIdentityReference(dto.created_by_actor_type, dto.created_by_actor_id),
    createdAt: dto.created_at ?? undefined,
  };
}
