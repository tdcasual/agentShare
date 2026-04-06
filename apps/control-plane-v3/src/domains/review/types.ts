/**
 * Review 领域类型定义
 *
 * 包含：
 * - Review 队列项
 * - Review 领域事件
 */

import { IdentityReference } from '../identity/types';

// ============================================
// 基础类型
// ============================================

export type ReviewResourceKind = 'task' | 'playbook' | 'secret' | 'capability';
export type ReviewDecision = 'pending' | 'approved' | 'rejected';

// ============================================
// 实体: Review Queue Item
// ============================================

export interface ReviewQueueItem {
  readonly resource_kind: ReviewResourceKind;
  readonly resource_id: string;
  readonly title: string;
  readonly submitted_by: IdentityReference;
  readonly submitted_at: string;
  readonly token_provenance?: {
    readonly token_id: string;
    readonly display_name: string;
  };
  readonly status: ReviewDecision;
  readonly reviewed_by?: IdentityReference;
  readonly reviewed_at?: string;
  // 额外的 UI 字段
  readonly publication_status?: string;
  readonly created_via_token_id?: string;
  readonly created_by_actor_type?: string;
  readonly created_by_actor_id?: string;
}

// ============================================
// 领域事件
// ============================================

export interface ReviewEvents {
  'review:approved': {
    readonly item: ReviewQueueItem;
    readonly reviewer: IdentityReference;
  };
  'review:rejected': {
    readonly item: ReviewQueueItem;
    readonly reviewer: IdentityReference;
    readonly reason?: string;
  };
  'review:submitted': {
    readonly item: ReviewQueueItem;
  };
}

// ============================================
// DTOs
// ============================================

export interface ApproveReviewInput {
  readonly comment?: string;
}

export interface RejectReviewInput {
  readonly reason: string;
  readonly comment?: string;
}

export interface ReviewQuery {
  readonly status?: ReviewDecision;
  readonly resourceKind?: ReviewResourceKind;
  readonly submittedBy?: string;
  readonly limit?: number;
  readonly offset?: number;
}
