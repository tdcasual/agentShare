/**
 * Task Dashboard Hooks
 *
 * 复杂的复合查询 hook，用于任务页面
 * 整合 Tasks、Runs、Access Tokens、Feedback
 */

'use client';

import { useMemo } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import { pollingConfig } from '@/lib/swr-config';
import * as taskApi from './api';
import * as identityApi from '../identity/api';
import type { Task, Run, AccessToken, AccessTokenFeedback, TaskTargetView } from './types';

export const TASK_DASHBOARD_TOKENS_KEY = 'bulk:task-dashboard-tokens';
export const TASK_DASHBOARD_FEEDBACK_KEY = 'bulk:task-dashboard-feedback';

export interface TaskView {
  task: Task;
  targets: TaskTargetView[];
}

/**
 * 获取任务仪表盘完整数据
 *
 * 包含：
 * - 所有 Tasks
 * - 所有 Runs
 * - 所有 Access Tokens
 * - 相关 Token Feedback
 */
export function useTaskDashboard(options?: SWRConfiguration) {
  // 并行获取基础数据
  const tasksQuery = useSWR<{ items: Task[] }>('/api/tasks', () => taskApi.getTasks(), {
    ...pollingConfig,
    ...options,
  });

  const runsQuery = useSWR<{ items: Run[] }>('/api/runs', () => taskApi.getRuns(), {
    ...pollingConfig,
    ...options,
  });

  const accessTokensQuery = useSWR<{ items: AccessToken[] }>(
    '/api/access-tokens',
    () => identityApi.getAccessTokens(),
    { ...pollingConfig, ...options }
  );

  const tokensQuery = useSWR<Record<string, AccessToken>>(
    accessTokensQuery.data?.items.length ? [TASK_DASHBOARD_TOKENS_KEY] : null,
    async () => {
      const allTokens = (await identityApi.getAccessTokens()).items;
      return Object.fromEntries(allTokens.map((token) => [token.id, token]));
    },
    { ...pollingConfig, ...options, revalidateOnFocus: false }
  );

  const tokensById = tokensQuery.data;

  const tasks = tasksQuery.data?.items;
  const targetAccessTokenIds = useMemo(() => {
    const ids = new Set<string>();
    (tasks ?? []).forEach((task) => {
      task.targetAccessTokenIds.forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [tasks]);

  const feedbackQuery = useSWR<Record<string, AccessTokenFeedback[]>>(
    targetAccessTokenIds.length > 0 ? [TASK_DASHBOARD_FEEDBACK_KEY, ...targetAccessTokenIds] : null,
    async () => {
      const grouped = (await taskApi.getAccessTokenFeedbackBulk(targetAccessTokenIds))
        .items_by_access_token;
      const allFeedback = Object.values(grouped).flat();
      return allFeedback.reduce<Record<string, AccessTokenFeedback[]>>((acc, item) => {
        const key = item.taskTargetId;
        acc[key] = [...(acc[key] ?? []), item];
        return acc;
      }, {});
    },
    { ...pollingConfig, ...options, revalidateOnFocus: false }
  );

  const feedbackByTargetId = feedbackQuery.data;

  // 构建任务视图
  const runs = runsQuery.data?.items;
  const runsByTaskTarget = useMemo(() => {
    const index = new Map<string, Run>();
    (runs ?? []).forEach((run) => {
      if (!run.taskTargetId) {
        return;
      }
      index.set(buildTaskTargetRunKey(run.taskId, run.taskTargetId), run);
    });
    return index;
  }, [runs]);

  const taskViews: TaskView[] = useMemo(() => {
    return (tasks ?? []).map((task) => ({
      task,
      targets: buildTaskTargets(task, tokensById ?? {}, runsByTaskTarget, feedbackByTargetId ?? {}),
    }));
  }, [tasks, tokensById, runsByTaskTarget, feedbackByTargetId]);

  // 计算加载状态
  const isLoading =
    tasksQuery.isLoading ||
    runsQuery.isLoading ||
    accessTokensQuery.isLoading ||
    (Boolean(accessTokensQuery.data?.items.length) && tokensQuery.isLoading) ||
    (targetAccessTokenIds.length > 0 && feedbackQuery.isLoading);

  const error =
    tasksQuery.error ||
    runsQuery.error ||
    accessTokensQuery.error ||
    tokensQuery.error ||
    feedbackQuery.error;

  const mutate = async () => {
    await Promise.all([
      tasksQuery.mutate(),
      runsQuery.mutate(),
      accessTokensQuery.mutate(),
      tokensQuery.mutate(),
      feedbackQuery.mutate(),
    ]);
  };

  return {
    tasks: tasks ?? [],
    runs: runs ?? [],
    tokensById: tokensById ?? {},
    taskViews,
    feedbackByTargetId: feedbackByTargetId ?? {},
    isLoading,
    error,
    mutate,
  };
}

/**
 * 规范化 run status 为合法的 TaskTargetView status
 */
function normalizeRunStatus(status: string | undefined): TaskTargetView['status'] {
  const validStatuses: TaskTargetView['status'][] = [
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
  ];
  if (status && validStatuses.includes(status as TaskTargetView['status'])) {
    return status as TaskTargetView['status'];
  }
  return 'pending';
}

function buildTaskTargets(
  task: Task,
  tokensById: Record<string, AccessToken>,
  runsByTaskTarget: Map<string, Run>,
  feedbackByTargetId: Record<string, AccessTokenFeedback[]>
): TaskTargetView[] {
  const targetAccessTokenIds = task.targetAccessTokenIds;

  return targetAccessTokenIds.map((accessTokenId, index) => {
    const targetId = task.targetIds[index] ?? accessTokenId;
    const accessToken = tokensById[accessTokenId] ?? null;
    const run = runsByTaskTarget.get(buildTaskTargetRunKey(task.id, targetId)) ?? null;
    const feedback = feedbackByTargetId[targetId] ?? [];

    return {
      targetId,
      accessTokenId,
      accessToken,
      run,
      feedback,
      status: normalizeRunStatus(run?.status),
    };
  });
}

function buildTaskTargetRunKey(taskId: string, targetId: string) {
  return `${taskId}:${targetId}`;
}
