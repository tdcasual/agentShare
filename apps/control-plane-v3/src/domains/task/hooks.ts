/**
 * Task Domain Hooks
 *
 * 基于 SWR 的数据获取和缓存
 */

'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { useCallback } from 'react';
import { swrConfig, pollingConfig, usePageVisible } from '@/lib/swr-config';
import * as api from './api';
import type { Task, Run, AccessTokenFeedback } from './types';
import type { TaskCreateInput, AccessTokenFeedbackCreateInput } from '@/lib/api-client';
import { TASK_DASHBOARD_FEEDBACK_KEY } from './hooks-dashboard';

// ============================================
// Tasks
// ============================================

export function useTasks(options?: SWRConfiguration) {
  const visible = usePageVisible();
  return useSWR<{ items: Task[] }>(
    options?.isPaused || !visible ? null : '/api/tasks',
    () => api.getTasks(),
    {
      ...pollingConfig, // 默认轮询，任务状态变化快
      ...options,
    }
  );
}

export function useCreateTask() {
  return useCallback(async (taskData: TaskCreateInput) => {
    const result = await api.createTask(taskData);
    await mutate('/api/tasks');
    return result;
  }, []);
}

// ============================================
// Runs
// ============================================

export function useRuns(options?: SWRConfiguration) {
  return useSWR<{ items: Run[] }>('/api/runs', () => api.getRuns(), {
    ...pollingConfig, // Run 状态实时变化
    ...options,
  });
}

// ============================================
// Feedback
// ============================================

export function useAccessTokenFeedback(accessTokenId: string | null, options?: SWRConfiguration) {
  return useSWR<{ items: AccessTokenFeedback[] }>(
    accessTokenId ? `/api/access-tokens/${accessTokenId}/feedback` : null,
    () => (accessTokenId ? api.getAccessTokenFeedback(accessTokenId) : { items: [] }),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateTaskTargetFeedback() {
  return useCallback(async (targetId: string, payload: AccessTokenFeedbackCreateInput) => {
    const result = await api.createTaskTargetFeedback(targetId, payload);
    // 刷新相关缓存
    await mutate('/api/tasks');
    await mutate('/api/runs');
    await mutate(
      (key) =>
        Array.isArray(key) &&
        key[0] === TASK_DASHBOARD_FEEDBACK_KEY
    );
    return result;
  }, []);
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
