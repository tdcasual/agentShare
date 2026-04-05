/**
 * Review Domain
 * 
 * 导出：
 * - 类型定义
 * - API 函数
 * - React Hooks
 */

// Types
export type {
  ReviewQueueItem,
  ReviewResourceKind,
  ReviewDecision,
  ReviewEvents,
  ApproveReviewInput,
  RejectReviewInput,
  ReviewQuery,
  // Alias for backward compatibility
  ReviewQueueItem as ReviewItem,
} from './types';

// API
export {
  reviewApi,
  getReviews,
  approveReview,
  rejectReview,
} from './api';

// Hooks
export {
  // Reviews
  useReviews,
  useApproveReview,
  useRejectReview,
  // Manual mutations
  refreshReviews,
  // Prefetch
  prefetchReviews,
} from './hooks';
