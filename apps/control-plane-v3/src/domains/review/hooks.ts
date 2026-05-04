/**
 * Review Domain Hooks
 *
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useCallback } from 'react';
import { pollingConfig, usePageVisible } from '@/lib/swr-config';
import * as api from './api';
import type { ReviewQueueItem, ApproveReviewInput, RejectReviewInput } from './types';


export function useReviews(options?: SWRConfiguration) {
  const visible = usePageVisible();
  return useSWR<{ items: ReviewQueueItem[] }>(
    options?.isPaused || !visible ? null : '/api/reviews',
    () => api.getReviews(),
    {
      ...pollingConfig,
      refreshInterval: 10_000,
      ...options,
    }
  );
}


export function useApproveReview() {
  return useCallback(
    async (resourceKind: string, resourceId: string, payload?: ApproveReviewInput) => {
      const result = await api.approveReview(resourceKind, resourceId, payload);
      await Promise.all([mutate('/api/reviews'), mutate('/api/catalog')]);
      return result;
    },
    []
  );
}

export function useRejectReview() {
  return useCallback(
    async (resourceKind: string, resourceId: string, payload: RejectReviewInput) => {
      const result = await api.rejectReview(resourceKind, resourceId, payload);
      await mutate('/api/reviews');
      return result;
    },
    []
  );
}


export function refreshReviews() {
  return mutate('/api/reviews');
}


export function prefetchReviews() {
  return mutate('/api/reviews', api.getReviews(), false);
}
