'use client';

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTaskDashboard } from '@/domains/task';
import { readFocusedEntry } from '@/lib/focused-entry';
import { useManagementPageSessionRecovery } from '@/lib/management-session-recovery';
import { useI18n } from '@/components/i18n-provider';
import type { Task, AgentToken, Run, TokenFeedback } from '@/domains/task';

export interface TaskTargetView {
  targetId: string;
  tokenId: string;
  token: AgentToken | null;
  run: Run | null;
  feedback: TokenFeedback[];
  status: 'pending' | 'claimed' | 'completed';
}

export interface TaskView {
  task: Task;
  targets: TaskTargetView[];
}

function buildTaskTargets(
  task: Task,
  tokensById: Record<string, AgentToken>,
  runs: Run[],
  feedbackByTargetId: Record<string, TokenFeedback[]>
): TaskTargetView[] {
  const targetTokenIds = task.targetTokenIds;

  return targetTokenIds.map((tokenId: string, index: number) => {
    const targetId = task.targetIds[index] ?? tokenId;
    const token = tokensById[tokenId] ?? null;
    const run =
      runs.find((item) => item.taskId === task.id && item.taskTargetId === targetId) ??
      runs.find((item) => item.taskId === task.id && item.tokenId === tokenId) ??
      null;

    let status: TaskTargetView['status'] = 'pending';
    if (run?.status === 'completed') {
      status = 'completed';
    } else if (run?.status === 'running' || (task.status === 'claimed' && task.claimedBy)) {
      status = 'claimed';
    }

    return {
      targetId,
      tokenId,
      token,
      run,
      feedback: feedbackByTargetId[targetId] ?? [],
      status,
    };
  });
}

export function useTasksPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);

  const {
    tasks,
    runs,
    tokensById,
    feedbackByTargetId,
    isLoading,
    error: dataError,
    mutate,
  } = useTaskDashboard();

  const {
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(dataError);

  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<
    'all' | 'needs_feedback' | 'in_flight'
  >('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => focus.taskId ?? null);

  const allTokens = useMemo(() => Object.values(tokensById), [tokensById]);

  const taskViews = useMemo(() => {
    return tasks.map((task) => ({
      task,
      targets: buildTaskTargets(task, tokensById, runs, feedbackByTargetId),
    }));
  }, [tasks, tokensById, runs, feedbackByTargetId]);

  const metrics = useMemo(() => {
    const totalTargets = taskViews.reduce((total, item) => total + item.targets.length, 0);
    const completedTargets = taskViews.reduce(
      (total, item) => total + item.targets.filter((target) => target.status === 'completed').length,
      0
    );
    const totalFeedback = Object.values(feedbackByTargetId).reduce(
      (total, items) => total + items.length,
      0
    );
    const completedTargetsAwaitingFeedback = taskViews.reduce(
      (total, item) =>
        total +
        item.targets.filter((target) => target.status === 'completed' && target.feedback.length === 0)
          .length,
      0
    );
    const inFlightTasksCount = taskViews.filter((item) =>
      item.targets.some((target) => target.status === 'pending' || target.status === 'claimed')
    ).length;
    return {
      totalTargets,
      completedTargets,
      totalFeedback,
      completedTargetsAwaitingFeedback,
      inFlightTasksCount,
    };
  }, [taskViews, feedbackByTargetId]);

  const visibleTaskViews = useMemo(() => {
    return taskViews.filter((item) => {
      if (selectedTaskFilter === 'needs_feedback') {
        return item.targets.some(
          (target) => target.status === 'completed' && target.feedback.length === 0
        );
      }
      if (selectedTaskFilter === 'in_flight') {
        return item.targets.some(
          (target) => target.status === 'pending' || target.status === 'claimed'
        );
      }
      return true;
    });
  }, [taskViews, selectedTaskFilter]);

  const selectedTask = useMemo(
    () => taskViews.find((item) => item.task.id === selectedTaskId) ?? null,
    [taskViews, selectedTaskId]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    clearAllAuthErrors();

    try {
      await mutate();
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }
      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : t('tasks.errors.refreshFailed')
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [mutate, clearAllAuthErrors, consumeUnauthorized, t]);

  return {
    t,
    isLoading,
    gateLoading,
    gateError,
    dataError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    error,
    setError,
    refreshError,
    isRefreshing,
    handleRefresh,
    selectedTaskFilter,
    setSelectedTaskFilter,
    selectedTaskId,
    setSelectedTaskId,
    selectedTask,
    allTokens,
    taskViews,
    visibleTaskViews,
    metrics,
    consumeUnauthorized,
    clearAllAuthErrors,
  };
}
