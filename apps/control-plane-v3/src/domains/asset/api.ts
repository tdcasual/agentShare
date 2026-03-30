/**
 * Asset Domain API
 * 
 * 负责：
 * - Asset CRUD (task, playbook, secret, capability, tool)
 * - Asset Review
 */

import { apiFetch } from '@/lib/api-client';
import type { Asset, AssetReview, CreateAssetInput, UpdateAssetInput, SubmitForReviewInput, ReviewAssetInput } from './types';

// ============================================
// Assets
// ============================================

export function getAssets() {
  return apiFetch<{ items: Asset[] }>('/api/assets');
}

export function createAsset(payload: CreateAssetInput) {
  return apiFetch<Asset>('/api/assets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAsset(assetId: string, payload: UpdateAssetInput) {
  return apiFetch<Asset>(`/api/assets/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAsset(assetId: string) {
  return apiFetch<{ id: string; status: string }>(`/api/assets/${assetId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Asset Reviews
// ============================================

export function submitForReview(assetId: string, payload: SubmitForReviewInput = {}) {
  return apiFetch<Asset>(`/api/assets/${assetId}/submit-for-review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function reviewAsset(assetId: string, payload: ReviewAssetInput) {
  return apiFetch<AssetReview>(`/api/assets/${assetId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============================================
// 向后兼容的 API 对象
// ============================================

export const assetApi = {
  // Assets
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  // Reviews
  submitForReview,
  reviewAsset,
};
