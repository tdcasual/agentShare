/**
 * Task Dashboard Hooks
 *
 * 复杂的复合查询 hook，用于任务页面
 * 整合 Tasks、Runs、Tokens、Feedback
 */

'use client';

import { useMemo } from 'react';
import useSWR, { SWRConfiguration } from 'swr';
import { pollingConfig } from '@/lib/swr-config';
import * as taskApi from './api';
import * as identityApi from '../identity/api';
import type { Task, Run, AgentToken, TokenFeedback, TaskTargetView } from './types';

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
 * - 所有 Agent Tokens
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

  const agentsQuery = useSWR<{ items: { id: string }[] }>(
    '/api/agents',
    () => identityApi.getAgents(),
    { ...pollingConfig, ...options }
  );

  const agentIds = agentsQuery.data?.items.map((a) => a.id) ?? [];
  const tokensQuery = useSWR<Record<string, AgentToken>>(
    agentIds.length > 0 ? [TASK_DASHBOARD_TOKENS_KEY, ...agentIds] : null,
    async () => {
      const grouped = (await identityApi.getAgentTokensBulk(agentIds)).items_by_agent;
      const allTokens = Object.values(grouped).flat();
      return Object.fromEntries(allTokens.map((token) => [token.id, token]));
    },
    { ...pollingConfig, ...options, revalidateOnFocus: false }
  );

  const tokensById = tokensQuery.data;

  const tasks = tasksQuery.data?.items;
  const targetTokenIds = useMemo(() => {
    const ids = new Set<string>();
    (tasks ?? []).forEach((task) => {
      (task.target_token_ids ?? []).forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  }, [tasks]);

  const feedbackQuery = useSWR<Record<string, TokenFeedback[]>>(
    targetTokenIds.length > 0 ? [TASK_DASHBOARD_FEEDBACK_KEY, ...targetTokenIds] : null,
    async () => {
      const grouped = (await taskApi.getTokenFeedbackBulk(targetTokenIds)).items_by_token;
      const allFeedback = Object.values(grouped).flat();
      return allFeedback.reduce<Record<string, TokenFeedback[]>>((acc, item) => {
        // Support both snake_case (API response) and camelCase (transformed model)
        // task_target_id is the raw API field, targetId is the domain model field
        const key = item.task_target_id ?? item.targetId;
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
      if (!run.task_target_id) {
        return;
      }
      index.set(buildTaskTargetRunKey(run.task_id, run.task_target_id), run);
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
    agentsQuery.isLoading ||
    (agentIds.length > 0 && tokensQuery.isLoading) ||
    (targetTokenIds.length > 0 && feedbackQuery.isLoading);

  const error =
    tasksQuery.error ||
    runsQuery.error ||
    agentsQuery.error ||
    tokensQuery.error ||
    feedbackQuery.error;

  const mutate = async () => {
    await Promise.all([
      tasksQuery.mutate(),
      runsQuery.mutate(),
      agentsQuery.mutate(),
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
  tokensById: Record<string, AgentToken>,
  runsByTaskTarget: Map<string, Run>,
  feedbackByTargetId: Record<string, TokenFeedback[]>
): TaskTargetView[] {
  const targetTokenIds = task.target_token_ids ?? [];

  return targetTokenIds.map((targetId) => {
    const token = tokensById[targetId] ?? null;
    const run = runsByTaskTarget.get(buildTaskTargetRunKey(task.id, targetId)) ?? null;
    const feedback = feedbackByTargetId[targetId] ?? [];

    return {
      targetId,
      tokenId: targetId,
      token,
      run,
      feedback,
      status: normalizeRunStatus(run?.status),
    };
  });
}

function buildTaskTargetRunKey(taskId: string, targetId: string) {
  return `${taskId}:${targetId}`;
}
