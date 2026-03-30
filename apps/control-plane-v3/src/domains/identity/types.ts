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
  presence: PresenceStatus;  // 可变：在线状态可以实时变化
  readonly credentials?: IdentityCredentials;
  readonly capabilities?: IdentityCapabilities;
  readonly relationships?: IdentityRelationships;
  readonly runtime?: IdentityRuntime;  // Agent 特有
  readonly session?: IdentitySession;   // Human 特有
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

export interface ManagementSessionSummary {
  readonly id: string;
  readonly session_id?: string;
  readonly identity_id?: string;
  readonly account_id?: string;
  readonly actor_id?: string;
  readonly identity_type?: IdentityType;
  readonly identity_name?: string;
  readonly role: string;
  readonly status: string;
  readonly email?: string;
  readonly display_name?: string;
  readonly expires_at: string;
  readonly created_at: string;
}

export interface AdminAccountSummary {
  readonly id: string;
  readonly email: string;
  readonly display_name: string;
  readonly role: 'viewer' | 'operator' | 'admin' | 'owner';
  readonly status: string;
  readonly is_active?: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly last_login_at?: string;
}

// API 返回的 Agent 格式（DTO）
export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly risk_tier: string;
  readonly auth_method: string;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
}
