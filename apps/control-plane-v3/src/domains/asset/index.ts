/**
 * Asset Domain
 * 
 * 导出：
 * - 类型定义
 * - API 函数
 * - React Hooks
 */

// Types
export type {
  Asset,
  AssetType,
  AssetVisibility,
  AssetStatus,
  AssetMetadata,
  AssetReview,
  AssetEvents,
  CreateAssetInput,
  UpdateAssetInput,
  SubmitForReviewInput,
  ReviewAssetInput,
} from './types';

// API
export {
  assetApi,
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  submitForReview,
  reviewAsset,
} from './api';

// Hooks
export {
  // Assets
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  // Reviews
  useSubmitForReview,
  useReviewAsset,
  // Manual mutations
  refreshAssets,
  // Prefetch
  prefetchAssets,
} from './hooks';
