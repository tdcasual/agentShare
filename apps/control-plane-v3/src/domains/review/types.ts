/**
 * Review 领域类型定义
 *
 * 包含：
 * - Review 队列项
 * - Review 领域事件
 */

import { IdentityReference } from '../identity/types';


export type ReviewResourceKind = 'task' | 'playbook' | 'secret' | 'capability';
export type ReviewDecision = 'pending' | 'approved' | 'rejected';


export interface ReviewQueueItem {
  readonly resource_kind: ReviewResourceKind;
  readonly resource_id: string;
  readonly title: string;
  readonly publication_status: string;
  readonly created_by_actor_type: string;
  readonly created_by_actor_id: string;
  readonly created_via_token_id?: string | null;
  readonly reviewed_by_actor_id?: string | null;
  readonly reviewed_at?: string | null;
  readonly review_reason?: string;
}


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


export interface ApproveReviewInput {
  readonly reason?: string;
}

export interface RejectReviewInput {
  readonly reason: string;
}
