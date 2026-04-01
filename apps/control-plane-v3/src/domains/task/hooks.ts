/**
 * Task Domain Hooks
 * 
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { swrConfig, pollingConfig } from '@/lib/swr-config';
import * as api from './api';
import type { Task, Run, TokenFeedback, TaskPriority, TaskTargetMode } from './types';
import type { TaskCreateInput, TokenFeedbackCreateInput } from '@/lib/api-client';
import { TASK_DASHBOARD_FEEDBACK_KEY, TASK_DASHBOARD_TOKENS_KEY } from './hooks-dashboard';

// ============================================
// Tasks
// ============================================

export function useTasks(options?: SWRConfiguration) {
  return useSWR<{ items: Task[] }>(
    '/api/tasks',
    () => api.getTasks(),
    {
      ...pollingConfig,  // 默认轮询，任务状态变化快
      ...options,
    }
  );
}

/**
 * 创建 Task（带乐观更新）
 */
export function useCreateTask() {
  return async (taskData: TaskCreateInput) => {
    // 乐观更新：先更新本地缓存
    const optimisticTask: Task = {
      id: 'temp-' + Date.now(),
      title: taskData.title,
      taskType: taskData.task_type,
      task_type: taskData.task_type,
      priority: (taskData.priority as TaskPriority) ?? 'normal',
      status: 'pending',
      publicationStatus: 'draft',
      publication_status: 'draft',
      targetMode: (taskData.target_mode as TaskTargetMode) ?? 'explicit_tokens',
      target_mode: taskData.target_mode ?? 'explicit_tokens',
      input: taskData.input ?? {},
      targetIds: [],
      target_ids: [],
      targetTokenIds: taskData.target_token_ids ?? [],
      target_token_ids: taskData.target_token_ids ?? [],
      createdBy: { id: 'current-user', type: 'human', name: 'Current User' },
      created_by_actor_id: 'current-user',
      created_by_actor_type: 'human',
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 更新缓存
    await mutate(
      '/api/tasks',
      (current: { items: Task[] } | undefined) => ({
        items: [optimisticTask, ...(current?.items || [])],
      }),
      false  // 不重新验证
    );

    // 发送请求
    const result = await api.createTask(taskData);

    // 重新验证数据
    await mutate('/api/tasks');

    return result;
  };
}

// ============================================
// Runs
// ============================================

export function useRuns(options?: SWRConfiguration) {
  return useSWR<{ items: Run[] }>(
    '/api/runs',
    () => api.getRuns(),
    {
      ...pollingConfig,  // Run 状态实时变化
      ...options,
    }
  );
}

// ============================================
// Feedback
// ============================================

export function useTokenFeedback(tokenId: string | null, options?: SWRConfiguration) {
  return useSWR<{ items: TokenFeedback[] }>(
    tokenId ? `/api/agent-tokens/${tokenId}/feedback` : null,
    () => tokenId ? api.getTokenFeedback(tokenId) : { items: [] },
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateTaskTargetFeedback() {
  return async (targetId: string, payload: TokenFeedbackCreateInput) => {
    const result = await api.createTaskTargetFeedback(targetId, payload);
    // 刷新相关缓存
    await mutate('/api/tasks');
    await mutate('/api/runs');
    await mutate((key) => Array.isArray(key) && (key[0] === TASK_DASHBOARD_FEEDBACK_KEY || key[0] === TASK_DASHBOARD_TOKENS_KEY));
    return result;
  };
}

// ============================================
// Manual Mutations
// ============================================

export function refreshTasks() {
  return mutate('/api/tasks');
}

export function refreshRuns() {
  return mutate('/api/runs');
}

// ============================================
// Prefetch
// ============================================

export function prefetchTasks() {
  return mutate('/api/tasks', api.getTasks(), false);
}

export function prefetchRuns() {
  return mutate('/api/runs', api.getRuns(), false);
}
