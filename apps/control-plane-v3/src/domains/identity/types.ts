/**
 * Identity 领域类型定义
 *
 * 包含：
 * - Identity 实体
 * - Identity 相关值对象
 * - Identity 领域事件
 */

// ============================================
// 基础类型
// ============================================

export type IdentityType = 'human' | 'agent';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type IdentityStatus = 'active' | 'inactive' | 'pending';

// ============================================
// 值对象
// ============================================

export interface IdentityProfile {
  readonly name: string;
  readonly avatar: string;
  readonly bio: string;
  readonly tags: string[];
  readonly createdAt: Date;
}

export interface IdentityStats {
  readonly tasksCompleted: number;
  readonly assetsOwned: number;
  readonly lastActiveAt: Date;
}

// ============================================
// 实体
// ============================================

export interface IdentityCapabilities {
  readonly canCreate?: string[];
  readonly canExecute: string[];
  readonly maxRiskTier?: string;
  readonly allowedScopes?: string[];
}

export interface IdentityRuntime {
  readonly adapterType: string;
  readonly endpoint?: string;
  readonly maxConcurrent: number;
  readonly timeout?: number;
}

export interface IdentitySession {
  readonly managementRole: string;
}

export interface IdentityCredentials {
  readonly primary: {
    readonly id: string;
    readonly type: string;
    readonly createdAt: Date;
  };
}

export interface IdentityRelationships {
  readonly trusts: string[];
  readonly trustedBy: string[];
  readonly delegates: string[];
  readonly delegatedBy: string[];
}

export interface Identity {
  readonly id: string;
  readonly type: IdentityType;
  readonly profile: IdentityProfile & { timezone?: string };
  readonly status: IdentityStatus;
  presence: PresenceStatus; // 可变：在线状态可以实时变化
  readonly credentials?: IdentityCredentials;
  readonly capabilities?: IdentityCapabilities;
  readonly relationships?: IdentityRelationships;
  readonly runtime?: IdentityRuntime; // Agent 特有
  readonly session?: IdentitySession; // Human 特有
  readonly stats?: IdentityStats;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ============================================
// 引用对象（用于跨领域引用）
// ============================================

export interface IdentityReference {
  readonly id: string;
  readonly type: IdentityType;
  readonly name: string;
  readonly avatar?: string;
}

// ============================================
// 领域事件
// ============================================

export interface IdentityEvents {
  'identity:created': {
    readonly identity: Identity;
  };
  'identity:updated': {
    readonly identityId: string;
    readonly changes: Partial<Identity>;
  };
  'identity:deleted': {
    readonly identityId: string;
  };
  'identity:presence:changed': {
    readonly identityId: string;
    readonly status: PresenceStatus;
    readonly previousStatus: PresenceStatus;
  };
}

// ============================================
// DTOs (用于 API)
// ============================================

export interface CreateIdentityInput {
  readonly type: IdentityType;
  readonly profile: Omit<IdentityProfile, 'createdAt'>;
}

export interface UpdateIdentityInput {
  readonly profile?: Partial<Omit<IdentityProfile, 'createdAt'>>;
  readonly status?: IdentityStatus;
}

// ============================================
// 查询参数
// ============================================

export interface IdentityQuery {
  readonly type?: IdentityType;
  readonly status?: IdentityStatus;
  readonly presence?: PresenceStatus;
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
}

// ============================================
// API 响应类型
// ============================================

export interface BootstrapStatus {
  readonly initialized: boolean;
  readonly setup_required?: boolean;
  readonly bootstrapped?: boolean;
  readonly has_valid_bootstrap_key?: boolean;
}

/**
 * Management Session 响应类型
 * 对应后端 /api/session/me 和 /api/session/login 返回
 *
 * 注意：这是后端实际返回的 Transport DTO（snake_case）
 */
export interface ManagementSessionSummary {
  readonly status: string;
  readonly actor_type: string;
  readonly actor_id: string;
  readonly role: 'viewer' | 'operator' | 'admin' | 'owner';
  readonly auth_method: string;
  readonly session_id: string;
  readonly email: string;
  readonly expires_in: number;
  readonly issued_at: number;
  readonly expires_at: number;
}

/**
 * Admin Account - 与后端 /api/admin-accounts 返回对齐
 * 后端返回: id, email, display_name, role, status, last_login_at
 */
export interface AdminAccountSummary {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly role: 'viewer' | 'operator' | 'admin' | 'owner';
  readonly status: string;
  readonly last_login_at?: string;
}

/**
 * Agent - 与后端 /api/agents 返回对齐
 * 后端返回: id, name, status, risk_tier, auth_method
 */
export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly risk_tier: string;
  readonly auth_method: string;
  readonly status: string;
}

export interface OpenClawAgentSummary {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly auth_method: string;
  readonly risk_tier: string;
  readonly workspace_root: string;
  readonly agent_dir: string;
  readonly model?: string | null;
  readonly thinking_level: string;
  readonly sandbox_mode: string;
  readonly dream_policy: OpenClawDreamPolicy;
  readonly tools_policy: Record<string, unknown>;
  readonly skills_policy: Record<string, unknown>;
  readonly allowed_capability_ids: string[];
  readonly allowed_task_types: string[];
}

export interface OpenClawDreamPolicy {
  readonly enabled: boolean;
  readonly max_steps_per_run: number;
  readonly max_followup_tasks: number;
  readonly allow_task_proposal: boolean;
  readonly allow_memory_write: boolean;
  readonly max_context_tokens: number;
}

export interface OpenClawSessionSummary {
  readonly id: string;
  readonly agent_id: string;
  readonly session_key: string;
  readonly display_name: string;
  readonly channel: string;
  readonly subject?: string | null;
  readonly transcript_metadata: Record<string, unknown>;
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly context_tokens: number;
  readonly updated_at: string;
}

export interface OpenClawAgentFileSummary {
  readonly agent_id: string;
  readonly file_name: string;
  readonly content: string;
}

export interface OpenClawDreamRunSummary {
  readonly id: string;
  readonly agent_id: string;
  readonly session_id: string;
  readonly task_id?: string | null;
  readonly objective: string;
  readonly status: string;
  readonly stop_reason?: string | null;
  readonly step_budget: number;
  readonly consumed_steps: number;
  readonly created_followup_tasks: number;
  readonly started_by_actor_type: string;
  readonly started_by_actor_id: string;
  readonly runtime_metadata: Record<string, unknown>;
  readonly updated_at: string;
}

export type OpenClawAgent = OpenClawAgentSummary;

export type OpenClawSession = OpenClawSessionSummary;

export type OpenClawAgentFile = OpenClawAgentFileSummary;

export type OpenClawDreamRun = OpenClawDreamRunSummary;
