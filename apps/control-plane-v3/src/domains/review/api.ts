/**
 * Review Domain API
 * 
 * 负责：
 * - Review 队列管理
 * - Approve/Reject 审核决策
 */

import { apiFetch } from '@/lib/api-client';
import type { ReviewQueueItem, ApproveReviewInput, RejectReviewInput } from './types';

// ============================================
// Review Queue
// ============================================

export function getReviews() {
  return apiFetch<{ items: ReviewQueueItem[] }>('/reviews');
}

// ============================================
// Review Decisions
// ============================================

export function approveReview(resourceKind: string, resourceId: string, payload: ApproveReviewInput = {}) {
  return apiFetch<ReviewQueueItem>(`/reviews/${resourceKind}/${resourceId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function rejectReview(resourceKind: string, resourceId: string, payload: RejectReviewInput = { reason: '' }) {
  return apiFetch<ReviewQueueItem>(`/reviews/${resourceKind}/${resourceId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============================================
// 向后兼容的 API 对象
// ============================================

export const reviewApi = {
  // Reviews
  getReviews,
  approveReview,
  rejectReview,
};
