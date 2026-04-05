/**
 * API Hooks
 * 
 * 统一导出所有 SWR hooks：
 * - 自动缓存
 * - 错误重试
 * - 乐观更新
 * - 请求去重
 * 
 * 推荐使用方式：
 * ```typescript
 * // 方式1: 从这里统一导入
 * import { useTasks, useAgents } from '@/hooks/use-api';
 * 
 * // 方式2: 直接从 domain 导入（推荐）
 * import { useTasks, useCreateTask } from '@/domains/task';
 * import { useAgents, useSession } from '@/domains/identity';
 * ```
 */

// ============================================
// 从各 domain 导出所有 hooks
// ============================================

export * from '@/domains/identity/hooks';
export * from '@/domains/task/hooks';
export * from '@/domains/review/hooks';

// ============================================
// 复合 hooks（用于复杂页面）
// ============================================

export { useTaskDashboard } from '@/domains/task/hooks-dashboard';
export { useAgentsWithTokens } from '@/domains/identity/hooks';

// ============================================
// SWR 工具
// ============================================

export { mutate } from 'swr';
export { swrConfig, pollingConfig, staticConfig } from '@/lib/swr-config';
