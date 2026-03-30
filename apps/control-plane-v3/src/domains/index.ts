/**
 * Domains 统一导出
 * 
 * 提供：
 * - 所有 Domain 类型
 * - 所有 Domain API
 * - 所有 Domain Hooks
 */

// ============================================
// Domain 命名空间导入
// ============================================

import { identityApi } from './identity';
import { taskApi } from './task';
import { assetApi } from './asset';
import { governanceApi } from './governance';
import { reviewApi } from './review';

// ============================================
// Domain APIs 命名空间导出
// ============================================

export { identityApi, taskApi, assetApi, governanceApi, reviewApi };

// ============================================
// Identity Domain 全部导出
// ============================================

export * from './identity';

// ============================================
// Task Domain 全部导出
// ============================================

export * from './task';

// ============================================
// Asset Domain 全部导出
// ============================================

export * from './asset';

// ============================================
// Governance Domain 全部导出
// ============================================

export * from './governance';

// ============================================
// Review Domain 全部导出
// ============================================

export * from './review';
