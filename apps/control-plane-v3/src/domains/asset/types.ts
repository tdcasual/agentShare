/**
 * Asset 领域类型定义
 * 
 * 包含：
 * - Asset 实体
 * - Asset 领域事件
 */

import { IdentityReference } from '../identity/types';

// ============================================
// 基础类型
// ============================================

export type AssetType = 'task' | 'playbook' | 'secret' | 'capability' | 'provider_config' | 'tool';
export type AssetVisibility = 'private' | 'public' | 'shared' | 'restricted';
export type AssetStatus = 'active' | 'inactive' | 'pending_review' | 'rejected';

// ============================================
// 值对象
// ============================================

export interface AssetMetadata {
  readonly version: string;
  readonly tags: string[];
  readonly category?: string;
  readonly license?: string;
}

// ============================================
// 实体: Asset
// ============================================

export interface Asset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: AssetType;
  readonly visibility: AssetVisibility;
  readonly status: AssetStatus;
  readonly owner: IdentityReference;
  readonly metadata: AssetMetadata;
  readonly content?: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt?: string;
}

// ============================================
// 实体: Asset Review
// ============================================

export interface AssetReview {
  readonly id: string;
  readonly assetId: string;
  readonly reviewer: IdentityReference;
  readonly verdict: 'approved' | 'rejected' | 'needs_changes';
  readonly comment: string;
  readonly createdAt: string;
}

// ============================================
// 领域事件
// ============================================

export interface AssetEvents {
  'asset:created': {
    readonly asset: Asset;
  };
  'asset:updated': {
    readonly assetId: string;
    readonly changes: Partial<Asset>;
  };
  'asset:submitted_for_review': {
    readonly assetId: string;
  };
  'asset:approved': {
    readonly assetId: string;
    readonly review: AssetReview;
  };
  'asset:rejected': {
    readonly assetId: string;
    readonly review: AssetReview;
  };
}

// ============================================
// DTOs
// ============================================

export interface CreateAssetInput {
  readonly name: string;
  readonly description: string;
  readonly type: AssetType;
  readonly visibility: AssetVisibility;
  readonly metadata?: Partial<AssetMetadata>;
  readonly content?: unknown;
}

export interface UpdateAssetInput {
  readonly name?: string;
  readonly description?: string;
  readonly visibility?: AssetVisibility;
  readonly metadata?: Partial<AssetMetadata>;
  readonly content?: unknown;
}

export interface SubmitForReviewInput {
  readonly comment?: string;
}

export interface ReviewAssetInput {
  readonly verdict: 'approved' | 'rejected' | 'needs_changes';
  readonly comment: string;
}
