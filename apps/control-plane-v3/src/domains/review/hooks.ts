/**
 * Review Domain Hooks
 * 
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { pollingConfig } from '@/lib/swr-config';
import * as api from './api';
import type { ReviewQueueItem, ApproveReviewInput, RejectReviewInput } from './types';

// ============================================
// Review Queue
// ============================================

export function useReviews(options?: SWRConfiguration) {
  return useSWR<{ items: ReviewQueueItem[] }>(
    '/api/reviews',
    () => api.getReviews(),
    {
      ...pollingConfig,  // Review 队列需要较新鲜的数据
      refreshInterval: 10000,  // 10秒轮询
      ...options,
    }
  );
}

// ============================================
// Review Actions
// ============================================

export function useApproveReview() {
  return async (resourceKind: string, resourceId: string, payload?: ApproveReviewInput) => {
    const result = await api.approveReview(resourceKind, resourceId, payload);
    await mutate('/api/reviews');
    return result;
  };
}

export function useRejectReview() {
  return async (resourceKind: string, resourceId: string, payload: RejectReviewInput) => {
    const result = await api.rejectReview(resourceKind, resourceId, payload);
    await mutate('/api/reviews');
    return result;
  };
}

// ============================================
// Manual Mutations
// ============================================

export function refreshReviews() {
  return mutate('/api/reviews');
}

// ============================================
// Prefetch
// ============================================

export function prefetchReviews() {
  return mutate('/api/reviews', api.getReviews(), false);
}
