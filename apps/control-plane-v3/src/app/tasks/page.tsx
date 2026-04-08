'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ClipboardList, MessageSquarePlus, Plus, RefreshCw, Target } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Layout } from '@/interfaces/human/layout';
import { useTaskDashboard, useCreateTask, useCreateTaskTargetFeedback } from '@/domains/task';
import { useAgentsWithTokens } from '@/domains/identity';
import { ApiError } from '@/lib/api-client';
import { readFocusedEntry } from '@/lib/focused-entry';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';
import type { Task, AgentToken, Run, TokenFeedback } from '@/domains/task';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Input, Textarea } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';

interface TaskTargetView {
  targetId: string;
  tokenId: string;
  token: AgentToken | null;
  run: Run | null;
  feedback: TokenFeedback[];
  status: 'pending' | 'claimed' | 'completed';
}

interface FeedbackTargetState {
  taskId: string;
  taskTitle: string;
  targetId: string;
  tokenLabel: string;
}

/**
 * Tasks Page - 任务管理页面
 *
 * 当前定位：
 * - 这是一个 admin 运营面板，而不是 runtime agent 的轻量任务收件箱。
 * - 页面会聚合任务、目标 token、执行 run、反馈覆盖率等 admin-only 运营信息。
 * - 低权限管理会话通过统一的 401/403 恢复链降级，而不是假装提供完整只读体验。
 */
export default function TasksPage() {
  return (
    <Layout>
      <TasksContent />
    </Layout>
  );
}

function TasksContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  // 使用新的 SWR hooks
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

  useAgentsWithTokens();
  const createTask = useCreateTask();
  const createFeedback = useCreateTaskTargetFeedback();

  // 本地 UI 状态
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => focus.taskId ?? null);
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTargetState | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    task_type: 'account_read',
    priority: 'normal',
    target_mode: 'explicit_tokens' as 'explicit_tokens' | 'broadcast',
    target_token_ids: [] as string[],
    input_json: '{\n  "provider": "github"\n}',
  });
  const [feedbackForm, setFeedbackForm] = useState({
    score: '5',
    verdict: 'accepted',
    summary: '',
  });
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [feedbackFormError, setFeedbackFormError] = useState<string | null>(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<
    'all' | 'needs_feedback' | 'in_flight'
  >('all');

  const allTokens = useMemo(() => Object.values(tokensById), [tokensById]);

  const taskViews = useMemo(() => {
    return tasks.map((task) => ({
      task,
      targets: buildTaskTargets(task, tokensById, runs, feedbackByTargetId),
    }));
  }, [tasks, tokensById, runs, feedbackByTargetId]);

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
  const visibleTaskViews = taskViews.filter((item) => {
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
  const selectedTask = taskViews.find((item) => item.task.id === selectedTaskId) ?? null;

  async function handleRefresh() {
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
        refreshFailure instanceof Error ? refreshFailure.message : 'Failed to refresh tasks'
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingTask(true);
    setTaskFormError(null);
    setError(null);
    clearAllAuthErrors();

    try {
      const parsedInput = parseJsonObject(taskForm.input_json);
      if (taskForm.target_mode === 'explicit_tokens' && taskForm.target_token_ids.length === 0) {
        throw new Error(
          t('tasks.errors.noTargetTokens') ||
            'Choose at least one remote access token or switch to broadcast mode.'
        );
      }

      await createTask({
        title: taskForm.title.trim(),
        task_type: taskForm.task_type.trim(),
        priority: taskForm.priority,
        input: parsedInput,
        target_mode: taskForm.target_mode,
        target_token_ids:
          taskForm.target_mode === 'explicit_tokens' ? taskForm.target_token_ids : [],
      });

      setTaskForm({
        title: '',
        task_type: 'account_read',
        priority: 'normal',
        target_mode: 'explicit_tokens',
        target_token_ids: [],
        input_json: '{\n  "provider": "github"\n}',
      });
      setShowCreateTaskModal(false);
    } catch (submitError) {
      if (consumeUnauthorized(submitError)) {
        return;
      }
      if (submitError instanceof ApiError) {
        setTaskFormError(submitError.detail);
      } else {
        setTaskFormError(
          submitError instanceof Error
            ? submitError.message
            : t('tasks.errors.createFailed') || 'Failed to create task'
        );
      }
    } finally {
      setSubmittingTask(false);
    }
  }

  async function handleSubmitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!feedbackTarget) {
      return;
    }

    setSubmittingFeedback(true);
    setFeedbackFormError(null);
    setError(null);
    clearAllAuthErrors();

    try {
      await createFeedback(feedbackTarget.targetId, {
        score: Number(feedbackForm.score),
        verdict: feedbackForm.verdict.trim(),
        summary: feedbackForm.summary.trim(),
      });

      setFeedbackForm({ score: '5', verdict: 'accepted', summary: '' });
      setFeedbackTarget(null);
    } catch (submitError) {
      if (consumeUnauthorized(submitError)) {
        return;
      }
      if (submitError instanceof ApiError) {
        setFeedbackFormError(submitError.detail);
      } else {
        setFeedbackFormError(
          submitError instanceof Error
            ? submitError.message
            : t('tasks.errors.feedbackFailed') || 'Failed to save feedback'
        );
      }
    } finally {
      setSubmittingFeedback(false);
    }
  }

  function toggleTargetToken(tokenId: string) {
    setTaskForm((current) => ({
      ...current,
      target_token_ids: current.target_token_ids.includes(tokenId)
        ? current.target_token_ids.filter((item) => item !== tokenId)
        : [...current.target_token_ids, tokenId],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/80 px-4 py-2 text-sm text-pink-700">
            <Target className="h-4 w-4" />
            {t('tasks.tokenTargetedDelivery') || 'Token-targeted delivery'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
              {t('tasks.title') || 'Task orchestration'}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-[#9CA3AF]">
              {t('tasks.description') ||
                'Publish work to specific remote access tokens, watch completion per token, and close the loop with feedback for off-project agents.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh') || 'Refresh'}
          </Button>
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('tasks.publishTask') || 'Publish Task'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('tasks.metrics.publishedTasks') || 'Published tasks'}
          value={tasks.length.toString()}
          hint={t('tasks.hints.publishedTasks') || 'currently visible active tasks'}
        />
        <MetricCard
          label={t('tasks.metrics.targetedTokens') || 'Targeted tokens'}
          value={totalTargets.toString()}
          hint={t('tasks.hints.targetedTokens') || 'explicit token assignments'}
        />
        <MetricCard
          label={t('tasks.metrics.completedTargets') || 'Completed targets'}
          value={completedTargets.toString()}
          hint={t('tasks.hints.completedTargets') || 'token-linked run records'}
        />
        <MetricCard
          label={t('tasks.metrics.feedbackRecords') || 'Feedback records'}
          value={totalFeedback.toString()}
          hint={t('tasks.hints.feedbackRecords') || 'human review notes on finished work'}
        />
      </div>

      <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">
              Human follow-up queue
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
              Track which remote-token-targeted runs are still in flight and which completed targets
              still need explicit feedback from a human supervisor for remote agent supervision.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
            <Badge variant="secondary">
              {completedTargetsAwaitingFeedback} completed target
              {completedTargetsAwaitingFeedback === 1 ? '' : 's'} awaiting feedback
            </Badge>
            <Badge variant="info">
              {inFlightTasksCount} in-flight task{inFlightTasksCount === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTaskFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={selectedTaskFilter === 'all'}
              onClick={() => setSelectedTaskFilter('all')}
            >
              All tasks
            </Button>
            <Button
              variant={selectedTaskFilter === 'needs_feedback' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={selectedTaskFilter === 'needs_feedback'}
              onClick={() => setSelectedTaskFilter('needs_feedback')}
            >
              Needs feedback
            </Button>
            <Button
              variant={selectedTaskFilter === 'in_flight' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={selectedTaskFilter === 'in_flight'}
              onClick={() => setSelectedTaskFilter('in_flight')}
            >
              In flight
            </Button>
          </div>
        </div>
      </Card>

      {selectedTask ? (
        <Card className="border border-pink-200 bg-pink-50/70 dark:border-pink-500/60 dark:bg-pink-500/10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
              Focused task
            </p>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {selectedTask.task.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              {selectedTask.targets.length} targeted access token
              {selectedTask.targets.length === 1 ? '' : 's'} linked to this remote-access task.
            </p>
          </div>
        </Card>
      ) : null}

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep working with live task data." />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message="You do not have permission to access some task management data. Sign in with an admin session to view the full task surface." />
      ) : null}

      {refreshError && (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700"
        >
          {refreshError}
        </Card>
      )}

      {(gateError || error || (!shouldShowSessionExpired && !shouldShowForbidden && dataError)) && (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700"
        >
          {gateError ??
            error ??
            (dataError instanceof Error ? dataError.message : 'Failed to load tasks')}
        </Card>
      )}

      {gateLoading || isLoading ? (
        <Card className="text-gray-600 dark:text-[#9CA3AF]">
          {t('tasks.loading') || 'Loading targeted tasks, remote token runs, and feedback...'}
        </Card>
      ) : null}

      {!gateLoading && !isLoading && taskViews.length === 0 ? (
        <Card variant="feature" className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-500">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {t('tasks.empty.title') || 'No tasks published yet'}
            </h2>
            <p className="text-gray-600 dark:text-[#9CA3AF]">
              {t('tasks.empty.description') ||
                'Create a task and target it to one or more remote access tokens from this page.'}
            </p>
          </div>
        </Card>
      ) : null}

      {!gateLoading && !isLoading && taskViews.length > 0 && visibleTaskViews.length === 0 ? (
        <Card className="border border-dashed border-pink-100 bg-white/80 text-sm text-gray-600 dark:border-[#3D3D5C] dark:bg-[#252540]/80 dark:text-[#9CA3AF]">
          No tasks match the current supervision filter.
        </Card>
      ) : null}

      <div className="grid gap-5">
        {visibleTaskViews.map(({ task, targets }) => {
          const feedbackItems = targets.flatMap((target) => target.feedback);
          const averageScore =
            feedbackItems.length > 0
              ? feedbackItems.reduce((total, item) => total + item.score, 0) / feedbackItems.length
              : null;
          const isFocusedTask = task.id === selectedTaskId;

          return (
            <Card
              key={task.id}
              data-testid={`task-card-${task.id}`}
              data-focus-state={isFocusedTask ? 'focused' : 'default'}
              variant="kawaii"
              hover
              className={cn(
                'cursor-pointer space-y-4',
                isFocusedTask &&
                  'border-pink-400 shadow-[0_0_0_1px_rgba(236,72,153,0.18)] dark:border-pink-400'
              )}
              onClick={() => setSelectedTaskId(task.id)}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                    <Badge
                      variant={
                        task.status === 'completed'
                          ? 'success'
                          : task.status === 'claimed'
                            ? 'warning'
                            : 'info'
                      }
                    >
                      {task.status}
                    </Badge>
                    <Badge variant={task.publication_status === 'active' ? 'primary' : 'warning'}>
                      {task.publication_status}
                    </Badge>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
                      {task.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                      {task.task_type} • created by {task.created_by_actor_type}:
                      {task.created_by_actor_id}
                    </p>
                  </div>
                </div>

                <div className="grid min-w-[220px] gap-2 rounded-3xl border border-pink-100 bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
                    {t('tasks.feedbackSummary') || 'Feedback summary'}
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-[#E8E8EC]">
                    {feedbackItems.length > 0
                      ? `${feedbackItems.length} ${t('tasks.reviews') || 'reviews'} • ${t('tasks.avg') || 'avg'} ${averageScore?.toFixed(1)}`
                      : t('tasks.noFeedback') || 'No feedback yet'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                    {targets.filter((target) => target.status === 'completed').length}/
                    {targets.length} {t('tasks.targetsCompleted') || 'targets completed'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-[#9CA3AF]">
                  {t('tasks.targetTokens') || 'Target tokens'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {targets.length === 0 ? (
                    <Badge variant="default">
                      {t('tasks.noTokenTargets') || 'No token targets'}
                    </Badge>
                  ) : (
                    targets.map((target) => (
                      <Badge
                        key={target.targetId}
                        variant={targetStatusVariant(target.status)}
                        className="text-xs"
                      >
                        {target.token?.display_name ?? target.tokenId}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modals 保持不变... */}
      <Modal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        title={t('tasks.publishTask') || 'Publish task'}
        description={
          t('tasks.publishTaskDescription') ||
          'Choose the concrete remote access tokens that should receive this work.'
        }
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleCreateTask}>
          <Input
            label={t('tasks.form.title') || 'Title'}
            value={taskForm.title}
            onChange={(event) =>
              setTaskForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder={t('tasks.form.titlePlaceholder') || 'Sync staging provider config'}
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('tasks.form.taskType') || 'Task type'}
              value={taskForm.task_type}
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, task_type: event.target.value }))
              }
              placeholder={t('tasks.form.taskTypePlaceholder') || 'config_sync'}
              required
            />
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]"
              >
                {t('tasks.form.priority') || 'Priority'}
              </label>
              <select
                id="task-priority"
                className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, priority: event.target.value }))
                }
              >
                <option value="low">{t('tasks.priorities.low') || 'low'}</option>
                <option value="normal">{t('tasks.priorities.normal') || 'normal'}</option>
                <option value="high">{t('tasks.priorities.high') || 'high'}</option>
                <option value="critical">{t('tasks.priorities.critical') || 'critical'}</option>
              </select>
            </div>
          </div>

          <Textarea
            label={t('tasks.form.inputPayload') || 'Input payload (JSON)'}
            value={taskForm.input_json}
            onChange={(event) =>
              setTaskForm((current) => ({ ...current, input_json: event.target.value }))
            }
            className="min-h-[180px] font-mono text-sm"
          />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">
                {t('tasks.form.targetMode') || 'Target mode'}
              </p>
              <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                {t('tasks.form.targetModeDescription') ||
                  'Explicit targets let you see completion by remote token directly.'}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setTaskForm((current) => ({ ...current, target_mode: 'explicit_tokens' }))
                }
                aria-pressed={taskForm.target_mode === 'explicit_tokens'}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  taskForm.target_mode === 'explicit_tokens'
                    ? 'border-pink-300 bg-pink-50'
                    : 'border-pink-100 bg-white'
                }`}
              >
                <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                  {t('tasks.form.explicitTokens') || 'Explicit tokens'}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                  {t('tasks.form.explicitTokensDesc') ||
                    'Send only to chosen remote access tokens.'}
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  setTaskForm((current) => ({
                    ...current,
                    target_mode: 'broadcast',
                    target_token_ids: [],
                  }))
                }
                aria-pressed={taskForm.target_mode === 'broadcast'}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  taskForm.target_mode === 'broadcast'
                    ? 'border-pink-300 bg-pink-50'
                    : 'border-pink-100 bg-white'
                }`}
              >
                <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                  {t('tasks.form.broadcast') || 'Broadcast'}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                  {t('tasks.form.broadcastDesc') ||
                    'Snapshot all active remote access tokens at publish time.'}
                </p>
              </button>
            </div>
          </div>

          {taskForm.target_mode === 'explicit_tokens' ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">
                  {t('tasks.form.targetTokens') || 'Target tokens'}
                </p>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                  {t('tasks.form.targetTokensDescription') ||
                    'Choose one or more managed remote access tokens.'}
                </p>
              </div>
              <div className="grid max-h-64 gap-3 overflow-y-auto rounded-3xl border border-pink-100 bg-pink-50/30 p-4">
                {allTokens.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {t('tasks.form.noTokensAvailable') ||
                      'No managed remote access tokens available yet. Create one from the Remote Access page first.'}
                  </p>
                ) : (
                  allTokens.map((token) => (
                    <label
                      key={token.id}
                      className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={taskForm.target_token_ids.includes(token.id)}
                        onChange={() => toggleTargetToken(token.id)}
                      />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                          {token.display_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                          {token.id} • {token.agent_id ?? token.agentId} •{' '}
                          {t('tasks.form.trust') || 'trust'}{' '}
                          {(token.trust_score ?? token.trustScore).toFixed(2)}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {taskFormError ? (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {taskFormError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateTaskModal(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" loading={submittingTask}>
              {t('tasks.publishTask') || 'Publish Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Selected Task Modal */}
      <Modal
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTaskId(null)}
        title={selectedTask?.task.title}
        description={
          selectedTask ? `${selectedTask.task.task_type} • ${selectedTask.task.id}` : undefined
        }
        size="xl"
      >
        {selectedTask ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={priorityVariant(selectedTask.task.priority)}>
                {selectedTask.task.priority}
              </Badge>
              <Badge
                variant={
                  selectedTask.task.status === 'completed'
                    ? 'success'
                    : selectedTask.task.status === 'claimed'
                      ? 'warning'
                      : 'info'
                }
              >
                {selectedTask.task.status}
              </Badge>
              <Badge
                variant={selectedTask.task.publication_status === 'active' ? 'primary' : 'warning'}
              >
                {selectedTask.task.publication_status}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="space-y-3 border border-pink-100 bg-white/90 dark:bg-[#252540]/90">
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-[#9CA3AF]">
                  {t('tasks.inputPayload') || 'Input payload'}
                </p>
                <pre className="overflow-x-auto rounded-2xl bg-gray-900 px-4 py-4 text-sm text-pink-50">
                  {JSON.stringify(selectedTask.task.input ?? {}, null, 2)}
                </pre>
              </Card>

              <Card className="space-y-3 border border-pink-100 bg-white/90 dark:bg-[#252540]/90">
                <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-[#9CA3AF]">
                  {t('tasks.publishingContext') || 'Publishing context'}
                </p>
                <div className="space-y-2 text-sm text-gray-700 dark:text-[#E8E8EC]">
                  <p>
                    {t('tasks.actor') || 'Actor'}: {selectedTask.task.created_by_actor_type}:
                    {selectedTask.task.created_by_actor_id}
                  </p>
                  <p>
                    {t('tasks.viaToken') || 'Via token'}:{' '}
                    {selectedTask.task.created_via_token_id ??
                      (t('tasks.directHumanPublish') || 'Direct human publish')}
                  </p>
                  <p>
                    {t('tasks.claimedBy') || 'Claimed by agent'}:{' '}
                    {selectedTask.task.claimed_by ??
                      (t('tasks.notClaimed') || 'Not currently claimed')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">
                  {t('tasks.perTokenStatus') || 'Per-token status'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                  {selectedTask.targets.filter((target) => target.status === 'completed').length}/
                  {selectedTask.targets.length} {t('tasks.completed') || 'completed'}
                </p>
              </div>

              <div className="grid gap-3">
                {selectedTask.targets.map((target) => (
                  <Card
                    key={target.targetId}
                    className="space-y-4 border border-pink-100 bg-pink-50/30"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={targetStatusVariant(target.status)}>
                            {target.status}
                          </Badge>
                          <Badge variant="secondary">
                            {target.token?.display_name ?? target.tokenId}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                            {target.token?.token_prefix ?? target.tokenId}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                            Agent {target.token?.agent_id ?? 'unknown'} • target {target.targetId}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFeedbackForm({ score: '5', verdict: 'accepted', summary: '' });
                          setFeedbackFormError(null);
                          setFeedbackTarget({
                            taskId: selectedTask.task.id,
                            taskTitle: selectedTask.task.title,
                            targetId: target.targetId,
                            tokenLabel: target.token?.display_name ?? target.tokenId,
                          });
                        }}
                        disabled={target.run === null}
                      >
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        {t('tasks.leaveFeedback') || 'Leave feedback'}
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <DetailStat
                        label={t('tasks.runResult') || 'Run result'}
                        value={
                          target.run?.result_summary ??
                          (target.status === 'pending'
                            ? t('tasks.waitingToRun') || 'Waiting to run'
                            : t('tasks.claimedNotCompleted') || 'Claimed, not completed')
                        }
                      />
                      <DetailStat
                        label={t('tasks.tokenTrust') || 'Token trust'}
                        value={
                          target.token
                            ? (target.token.trust_score ?? target.token.trustScore).toFixed(2)
                            : t('tasks.unknown') || 'Unknown'
                        }
                      />
                      <DetailStat
                        label={t('tasks.feedbackCount') || 'Feedback count'}
                        value={target.feedback.length.toString()}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {target.feedback.length === 0 ? (
                        <Badge variant="default">
                          {t('tasks.noFeedback') || 'No feedback yet'}
                        </Badge>
                      ) : (
                        target.feedback.map((item) => (
                          <Badge
                            key={item.id}
                            variant={item.verdict === 'accepted' ? 'success' : 'warning'}
                            className="text-xs"
                          >
                            {item.verdict} • {item.score}/5
                          </Badge>
                        ))
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Feedback Modal */}
      <Modal
        isOpen={feedbackTarget !== null}
        onClose={() => setFeedbackTarget(null)}
        title={
          feedbackTarget
            ? `${t('tasks.feedbackFor') || 'Feedback for'} ${feedbackTarget.tokenLabel}`
            : t('tasks.feedback') || 'Feedback'
        }
        description={
          feedbackTarget ? `${feedbackTarget.taskTitle} • ${feedbackTarget.targetId}` : undefined
        }
      >
        <form className="space-y-4" onSubmit={handleSubmitFeedback}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="feedback-score"
                className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]"
              >
                {t('tasks.form.score') || 'Score'}
              </label>
              <select
                id="feedback-score"
                className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                value={feedbackForm.score}
                onChange={(event) =>
                  setFeedbackForm((current) => ({ ...current, score: event.target.value }))
                }
              >
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>
            <Input
              label={t('tasks.form.verdict') || 'Verdict'}
              value={feedbackForm.verdict}
              onChange={(event) =>
                setFeedbackForm((current) => ({ ...current, verdict: event.target.value }))
              }
              placeholder={t('tasks.form.verdictPlaceholder') || 'accepted'}
              required
            />
          </div>

          <Textarea
            label={t('tasks.form.summary') || 'Summary'}
            value={feedbackForm.summary}
            onChange={(event) =>
              setFeedbackForm((current) => ({ ...current, summary: event.target.value }))
            }
            className="min-h-[140px]"
            placeholder={
              t('tasks.form.summaryPlaceholder') ||
              'Call out what went well, what should change, and whether this token should be trusted with similar work.'
            }
          />

          {feedbackFormError ? (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {feedbackFormError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setFeedbackTarget(null)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" loading={submittingFeedback}>
              {t('tasks.saveFeedback') || 'Save feedback'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2 border border-pink-100 bg-white/90 dark:bg-[#252540]/90">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-[#9CA3AF]">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{hint}</p>
    </Card>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-gray-800 dark:text-[#E8E8EC]">{value}</p>
    </div>
  );
}

function buildTaskTargets(
  task: Task,
  tokensById: Record<string, AgentToken>,
  runs: Run[],
  feedbackByTargetId: Record<string, TokenFeedback[]>
): TaskTargetView[] {
  const targetTokenIds = task.target_token_ids ?? task.targetTokenIds ?? [];

  return targetTokenIds.map((tokenId: string, index: number) => {
    const targetId = (task.target_ids ?? task.targetIds ?? [])[index] ?? `${task.id}:${tokenId}`;
    const token = tokensById[tokenId] ?? null;
    const run =
      runs.find((item) => item.task_id === task.id && item.task_target_id === targetId) ??
      runs.find((item) => item.task_id === task.id && item.token_id === tokenId) ??
      null;

    let status: TaskTargetView['status'] = 'pending';
    if (run?.status === 'completed') {
      status = 'completed';
    } else if (run?.status === 'running' || (task.status === 'claimed' && task.claimed_by)) {
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

function parseJsonObject(raw: string) {
  const parsed = JSON.parse(raw) as unknown;
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Input payload must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

function priorityVariant(priority: string) {
  switch (priority) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'low':
      return 'default';
    default:
      return 'info';
  }
}

function targetStatusVariant(status: TaskTargetView['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'claimed':
      return 'warning';
    default:
      return 'default';
  }
}
