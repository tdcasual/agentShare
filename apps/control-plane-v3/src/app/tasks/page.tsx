'use client';

import { FormEvent, useMemo, useState, memo } from 'react';
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

interface TaskFormState {
  title: string;
  task_type: string;
  priority: string;
  target_mode: 'explicit_tokens' | 'broadcast';
  target_token_ids: string[];
  input_json: string;
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

const TasksContent = memo(function TasksContent() {
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
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    title: '',
    task_type: 'account_read',
    priority: 'normal',
    target_mode: 'explicit_tokens',
    target_token_ids: [],
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
        refreshFailure instanceof Error ? refreshFailure.message : t('tasks.errors.refreshFailed')
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
      const parsedInput = parseJsonObject(taskForm.input_json, t('tasks.errors.invalidPayload'));
      if (taskForm.target_mode === 'explicit_tokens' && taskForm.target_token_ids.length === 0) {
        throw new Error(t('tasks.errors.noTargetTokens') || t('tasks.errors.noTargetTokens'));
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
          submitError instanceof Error ? submitError.message : t('tasks.errors.createFailed')
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
          submitError instanceof Error ? submitError.message : t('tasks.errors.feedbackFailed')
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 px-4 py-2 text-sm text-[var(--kw-primary-600)]">
            <Target className="h-4 w-4" />
            {t('tasks.tokenTargetedDelivery')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('tasks.title')}
            </h1>
            <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('tasks.description') || t('tasks.description')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('tasks.publishTask')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('tasks.metrics.publishedTasks')}
          value={tasks.length.toString()}
          hint={t('tasks.hints.publishedTasks') || 'currently visible active tasks'}
        />
        <MetricCard
          label={t('tasks.metrics.targetedTokens')}
          value={totalTargets.toString()}
          hint={t('tasks.hints.targetedTokens') || 'explicit token assignments'}
        />
        <MetricCard
          label={t('tasks.metrics.completedTargets')}
          value={completedTargets.toString()}
          hint={t('tasks.hints.completedTargets') || 'token-linked run records'}
        />
        <MetricCard
          label={t('tasks.metrics.feedbackRecords')}
          value={totalFeedback.toString()}
          hint={t('tasks.hints.feedbackRecords') || 'human review notes on finished work'}
        />
      </div>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              Human follow-up queue
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              Track which remote-token-targeted runs are still in flight and which completed targets
              still need explicit feedback from a human supervisor for remote agent supervision.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
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
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              Focused task
            </p>
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {selectedTask.task.title}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {selectedTask.targets.length} targeted access token
              {selectedTask.targets.length === 1 ? '' : 's'} linked to this remote-access task.
            </p>
          </div>
        </Card>
      ) : null}

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={t('tasks.sessionExpired')} />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t('tasks.sessionForbidden')} />
      ) : null}

      {refreshError && (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)]"
        >
          {refreshError}
        </Card>
      )}

      {(gateError || error || (!shouldShowSessionExpired && !shouldShowForbidden && dataError)) && (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)]"
        >
          {gateError ??
            error ??
            (dataError instanceof Error ? dataError.message : t('tasks.errors.loadFailed'))}
        </Card>
      )}

      {gateLoading || isLoading ? (
        <Card className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {t('tasks.loading')}
        </Card>
      ) : null}

      {!gateLoading && !isLoading && taskViews.length === 0 ? (
        <Card variant="feature" className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-500)]">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('tasks.empty.title')}
            </h2>
            <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('tasks.empty.description') || t('tasks.empty.description')}
            </p>
          </div>
        </Card>
      ) : null}

      {!gateLoading && !isLoading && taskViews.length > 0 && visibleTaskViews.length === 0 ? (
        <Card className="dark:bg-[var(--kw-dark-surface)]/80 border border-dashed border-[var(--kw-border)] bg-white/80 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
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
                  'ring-[var(--kw-primary-400)]/20 border-[var(--kw-primary-400)] ring-1 dark:border-[var(--kw-primary-400)]'
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
                    <Badge variant={task.publicationStatus === 'active' ? 'primary' : 'warning'}>
                      {task.publicationStatus}
                    </Badge>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                      {task.title}
                    </h2>
                    <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      {task.taskType} • created by {task.createdBy.type}:{task.createdBy.id}
                    </p>
                  </div>
                </div>

                <div className="grid min-w-0 gap-2 rounded-3xl border border-[var(--kw-border)] bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {t('tasks.feedbackSummary')}
                  </p>
                  <p className="text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                    {feedbackItems.length > 0
                      ? `${feedbackItems.length} ${t('tasks.reviews') || 'reviews'} • ${t('tasks.avg') || 'avg'} ${averageScore?.toFixed(1)}`
                      : t('tasks.noFeedback')}
                  </p>
                  <p className="text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {targets.filter((target) => target.status === 'completed').length}/
                    {targets.length} {t('tasks.targetsCompleted') || 'targets completed'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('tasks.targetTokens')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {targets.length === 0 ? (
                    <Badge variant="default">{t('tasks.noTokenTargets')}</Badge>
                  ) : (
                    targets.map((target) => (
                      <Badge
                        key={target.targetId}
                        variant={targetStatusVariant(target.status)}
                        className="text-xs"
                      >
                        {target.token?.displayName ?? target.tokenId}
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
        title={t('tasks.publishTask')}
        description={t('tasks.publishTaskDescription') || t('tasks.publishTaskDescription')}
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleCreateTask}>
          <Input
            label={t('tasks.form.title')}
            value={taskForm.title}
            onChange={(event) =>
              setTaskForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder={t('tasks.form.titlePlaceholder')}
            required
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('tasks.form.taskType')}
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
                className="mb-1.5 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
              >
                {t('tasks.form.priority')}
              </label>
              <select
                id="task-priority"
                className="w-full rounded-2xl border-2 border-[var(--kw-primary-200)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)]"
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, priority: event.target.value }))
                }
              >
                <option value="low">{t('tasks.priorities.low')}</option>
                <option value="normal">{t('tasks.priorities.normal')}</option>
                <option value="high">{t('tasks.priorities.high')}</option>
                <option value="critical">{t('tasks.priorities.critical')}</option>
              </select>
            </div>
          </div>

          <Textarea
            label={t('tasks.form.inputPayload')}
            value={taskForm.input_json}
            onChange={(event) =>
              setTaskForm((current) => ({ ...current, input_json: event.target.value }))
            }
            className="min-h-[180px] font-mono text-sm"
          />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {t('tasks.form.targetMode')}
              </p>
              <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {t('tasks.form.targetModeDescription') || t('tasks.form.targetModeDescription')}
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
                    ? 'border-[var(--kw-primary-300)] bg-[var(--kw-primary-50)]'
                    : 'border-[var(--kw-border)] bg-white'
                }`}
              >
                <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('tasks.form.explicitTokens')}
                </p>
                <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('tasks.form.explicitTokensDesc') || t('tasks.form.explicitTokensDesc')}
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
                    ? 'border-[var(--kw-primary-300)] bg-[var(--kw-primary-50)]'
                    : 'border-[var(--kw-border)] bg-white'
                }`}
              >
                <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('tasks.form.broadcast')}
                </p>
                <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('tasks.form.broadcastDesc') || t('tasks.form.broadcastDesc')}
                </p>
              </button>
            </div>
          </div>

          {taskForm.target_mode === 'explicit_tokens' ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('tasks.form.targetTokens')}
                </p>
                <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('tasks.form.targetTokensDescription') ||
                    t('tasks.form.targetTokensDescription')}
                </p>
              </div>
              <div className="bg-[var(--kw-primary-50)]/30 grid max-h-64 gap-3 overflow-y-auto rounded-3xl border border-[var(--kw-border)] p-4">
                {allTokens.length === 0 ? (
                  <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {t('tasks.form.noTokensAvailable') || t('tasks.form.noTokensAvailable')}
                  </p>
                ) : (
                  allTokens.map((token) => (
                    <label
                      key={token.id}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--kw-border)] bg-white px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={taskForm.target_token_ids.includes(token.id)}
                        onChange={() => toggleTargetToken(token.id)}
                      />
                      <div>
                        <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                          {token.displayName}
                        </p>
                        <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                          {token.id} • {token.agentId} • {t('tasks.form.trust') || 'trust'}{' '}
                          {(token.trustScore ?? 0).toFixed(2)}
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
              className="rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] px-4 py-3 text-sm text-[var(--kw-rose-text)]"
            >
              {taskFormError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateTaskModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={submittingTask}>
              {t('tasks.publishTask')}
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
          selectedTask ? `${selectedTask.task.taskType} • ${selectedTask.task.id}` : undefined
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
                variant={selectedTask.task.publicationStatus === 'active' ? 'primary' : 'warning'}
              >
                {selectedTask.task.publicationStatus}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-3 border border-[var(--kw-border)] bg-white/90">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('tasks.inputPayload')}
                </p>
                <pre className="overflow-x-auto rounded-2xl bg-[var(--kw-dark-bg)] px-4 py-4 text-sm text-[var(--kw-primary-50)]">
                  {JSON.stringify(selectedTask.task.input ?? {}, null, 2)}
                </pre>
              </Card>

              <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-3 border border-[var(--kw-border)] bg-white/90">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('tasks.publishingContext')}
                </p>
                <div className="space-y-2 text-sm text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  <p>
                    {t('tasks.actor')}: {selectedTask.task.createdBy.type}:
                    {selectedTask.task.createdBy.id}
                  </p>
                  <p>
                    {t('tasks.viaToken')}:{' '}
                    {selectedTask.task.createdViaTokenId ?? t('tasks.directHumanPublish')}
                  </p>
                  <p>
                    {t('tasks.claimedBy')}: {selectedTask.task.claimedBy ?? t('tasks.notClaimed')}
                  </p>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('tasks.perTokenStatus')}
                </h3>
                <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {selectedTask.targets.filter((target) => target.status === 'completed').length}/
                  {selectedTask.targets.length} {t('tasks.completed') || 'completed'}
                </p>
              </div>

              <div className="grid gap-3">
                {selectedTask.targets.map((target) => (
                  <Card
                    key={target.targetId}
                    className="bg-[var(--kw-primary-50)]/30 space-y-4 border border-[var(--kw-border)]"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={targetStatusVariant(target.status)}>
                            {target.status}
                          </Badge>
                          <Badge variant="secondary">
                            {target.token?.displayName ?? target.tokenId}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                            {target.token?.tokenPrefix ?? target.tokenId}
                          </p>
                          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                            Agent {target.token?.agentId ?? 'unknown'} • target {target.targetId}
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
                            tokenLabel: target.token?.displayName ?? target.tokenId,
                          });
                        }}
                        disabled={target.run === null}
                      >
                        <MessageSquarePlus className="mr-2 h-4 w-4" />
                        {t('tasks.leaveFeedback')}
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <DetailStat
                        label={t('tasks.runResult')}
                        value={
                          target.run?.resultSummary ??
                          (target.status === 'pending'
                            ? t('tasks.waitingToRun')
                            : t('tasks.claimedNotCompleted'))
                        }
                      />
                      <DetailStat
                        label={t('tasks.tokenTrust')}
                        value={
                          target.token
                            ? (target.token.trustScore ?? 0).toFixed(2)
                            : t('tasks.unknown')
                        }
                      />
                      <DetailStat
                        label={t('tasks.feedbackCount')}
                        value={target.feedback.length.toString()}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {target.feedback.length === 0 ? (
                        <Badge variant="default">{t('tasks.noFeedback')}</Badge>
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
            ? `${t('tasks.feedbackFor')} ${feedbackTarget.tokenLabel}`
            : t('tasks.feedback')
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
                className="mb-1.5 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
              >
                {t('tasks.form.score')}
              </label>
              <select
                id="feedback-score"
                className="w-full rounded-2xl border-2 border-[var(--kw-primary-200)] bg-white px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)]"
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
              label={t('tasks.form.verdict')}
              value={feedbackForm.verdict}
              onChange={(event) =>
                setFeedbackForm((current) => ({ ...current, verdict: event.target.value }))
              }
              placeholder={t('tasks.form.verdictPlaceholder') || 'accepted'}
              required
            />
          </div>

          <Textarea
            label={t('tasks.form.summary')}
            value={feedbackForm.summary}
            onChange={(event) =>
              setFeedbackForm((current) => ({ ...current, summary: event.target.value }))
            }
            className="min-h-[140px]"
            placeholder={t('tasks.form.summaryPlaceholder') || t('tasks.form.summaryPlaceholder')}
          />

          {feedbackFormError ? (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] px-4 py-3 text-sm text-[var(--kw-rose-text)]"
            >
              {feedbackFormError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setFeedbackTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={submittingFeedback}>
              {t('tasks.saveFeedback')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
});

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-2 border border-[var(--kw-border)] bg-white/90">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {label}
      </p>
      <p className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {value}
      </p>
      <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {hint}
      </p>
    </Card>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {value}
      </p>
    </div>
  );
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

function parseJsonObject(raw: string, invalidPayloadMessage: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(invalidPayloadMessage);
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
