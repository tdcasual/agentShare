/**
 * Asset Domain Hooks
 * 
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { swrConfig, staticConfig } from '@/lib/swr-config';
import * as api from './api';
import type { Asset, AssetReview, CreateAssetInput, UpdateAssetInput, ReviewAssetInput } from './types';

// ============================================
// Assets
// ============================================

export function useAssets(options?: SWRConfiguration) {
  return useSWR<{ items: Asset[] }>(
    '/api/assets',
    () => api.getAssets(),
    {
      ...staticConfig,  // Assets 变化不频繁
      ...options,
    }
  );
}

export function useCreateAsset() {
  return async (payload: CreateAssetInput) => {
    const result = await api.createAsset(payload);
    await mutate('/api/assets');
    return result;
  };
}

export function useUpdateAsset() {
  return async (assetId: string, payload: UpdateAssetInput) => {
    const result = await api.updateAsset(assetId, payload);
    await mutate('/api/assets');
    await mutate(`/api/assets/${assetId}`, result, false);
    return result;
  };
}

export function useDeleteAsset() {
  return async (assetId: string) => {
    const result = await api.deleteAsset(assetId);
    await mutate('/api/assets');
    return result;
  };
}

// ============================================
// Reviews
// ============================================

export function useSubmitForReview() {
  return async (assetId: string, comment?: string) => {
    const result = await api.submitForReview(assetId, { comment });
    await mutate('/api/assets');
    await mutate(`/api/assets/${assetId}`, result, false);
    return result;
  };
}

export function useReviewAsset() {
  return async (assetId: string, payload: ReviewAssetInput) => {
    const result = await api.reviewAsset(assetId, payload);
    await mutate('/api/assets');
    return result;
  };
}

// ============================================
// Manual Mutations
// ============================================

export function refreshAssets() {
  return mutate('/api/assets');
}

// ============================================
// Prefetch
// ============================================

export function prefetchAssets() {
  return mutate('/api/assets', api.getAssets(), false);
}
