/**
 * 跨领域共享类型
 *
 * 用于打破 task 与 identity 等领域的循环依赖
 */

// ============================================
// Identity 共享
// ============================================

export interface IdentityReference {
  readonly id: string;
  readonly type: 'human' | 'agent';
  readonly name: string;
  readonly avatar?: string;
}

// ============================================
// Task/Token 共享
// ============================================

export interface AccessTokenTransport {
  readonly id: string;
  readonly display_name: string;
  readonly token_prefix: string;
  readonly status: string;
  readonly subject_type: string;
  readonly subject_id: string;
  readonly scopes?: string[];
  readonly labels?: Record<string, string>;
  readonly policy?: Record<string, unknown>;
  readonly expires_at?: string | null;
  readonly issued_by_actor_type?: string | null;
  readonly issued_by_actor_id?: string | null;
  readonly last_used_at?: string | null;
  readonly completed_runs?: number | null;
  readonly successful_runs?: number | null;
  readonly success_rate?: number | null;
  readonly last_feedback_at?: string | null;
  readonly trust_score?: number | null;
}

export interface AccessToken {
  readonly id: string;
  readonly displayName: string;
  readonly tokenPrefix: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly trustScore?: number;
  readonly status: string;
  readonly scopes: string[];
  readonly labels: Record<string, string>;
  readonly policy: Record<string, unknown>;
  readonly expiresAt?: string;
  readonly issuedByActorType?: string;
  readonly issuedByActorId?: string;
  readonly lastUsedAt?: string;
  readonly lastFeedbackAt?: string;
  readonly successRate?: number;
  readonly completedRuns?: number;
  readonly successfulRuns?: number;
}

export function normalizeAccessToken(dto: AccessTokenTransport): AccessToken {
  return {
    id: dto.id,
    displayName: dto.display_name,
    tokenPrefix: dto.token_prefix,
    subjectType: dto.subject_type,
    subjectId: dto.subject_id,
    trustScore: dto.trust_score ?? undefined,
    status: dto.status,
    scopes: dto.scopes ?? [],
    labels: dto.labels ?? {},
    policy: dto.policy ?? {},
    expiresAt: dto.expires_at ?? undefined,
    issuedByActorType: dto.issued_by_actor_type ?? undefined,
    issuedByActorId: dto.issued_by_actor_id ?? undefined,
    lastUsedAt: dto.last_used_at ?? undefined,
    lastFeedbackAt: dto.last_feedback_at ?? undefined,
    successRate: dto.success_rate ?? undefined,
    completedRuns: dto.completed_runs ?? undefined,
    successfulRuns: dto.successful_runs ?? undefined,
  };
}
