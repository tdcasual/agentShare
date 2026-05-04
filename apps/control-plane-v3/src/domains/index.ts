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
import { governanceApi } from './governance';
import { reviewApi } from './review';
import { eventApi } from './event';
import { searchApi } from './search';
import { catalogApi } from './catalog';
import { approvalApi } from './approval';
import { playbookApi } from './playbook';

// ============================================
// Domain APIs 命名空间导出
// ============================================

export {
  identityApi,
  taskApi,
  governanceApi,
  reviewApi,
  eventApi,
  searchApi,
  catalogApi,
  approvalApi,
  playbookApi,
};

// ============================================
// Identity Domain 全部导出
// ============================================

export * from './identity';

// ============================================
// Task Domain 全部导出
// ============================================

export * from './task';

// ============================================
// Governance Domain 全部导出
// ============================================

export * from './governance';

// ============================================
// Review Domain 全部导出
// ============================================

export * from './review';

// ============================================
// Event Domain 全部导出
// ============================================

export * from './event';

// ============================================
// Search Domain 全部导出
// ============================================

export * from './search';

// ============================================
// Catalog Domain 全部导出
// ============================================

export * from './catalog';

// ============================================
// Approval Domain 全部导出
// ============================================

export * from './approval';

// ============================================
// Playbook Domain 全部导出
// ============================================

export * from './playbook';
