'use client';

import { memo, useCallback } from 'react';
import { ClipboardList, MessageSquarePlus, Plus, RefreshCw, Target } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { useCreateTask, useCreateTaskTargetFeedback } from '@/domains/task';
import {
  ManagementPageAlerts,
} from '@/lib/management-session-recovery';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Input, Textarea } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';
import { FilterButton } from '@/shared/ui-primitives/filter-button';
import { MetricCard } from '@/shared/ui-primitives/metric';
import { useTasksPage, type TaskView } from './use-tasks-page';
import { useTasksForm } from './use-tasks-form';

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
  const page = useTasksPage();
  const createTask = useCreateTask();
  const createFeedback = useCreateTaskTargetFeedback();

  const form = useTasksForm({
    createTask,
    createFeedback,
    consumeUnauthorized: page.consumeUnauthorized,
    clearAllAuthErrors: page.clearAllAuthErrors,
    onTaskCreated: page.handleRefresh,
    onFeedbackCreated: page.handleRefresh,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 dark:bg-[var(--kw-dark-surface)]/80 px-4 py-2 text-sm text-[var(--kw-primary-600)]">
            <Target className="h-4 w-4" />
            {page.t('tasks.tokenTargetedDelivery')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {page.t('tasks.title')}
            </h1>
            <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {page.t('tasks.description')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={page.handleRefresh} loading={page.isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {page.t('common.refresh')}
          </Button>
          <Button onClick={form.openCreateTaskModal}>
            <Plus className="mr-2 h-4 w-4" />
            {page.t('tasks.publishTask')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={page.t('tasks.metrics.publishedTasks')}
          value={page.taskViews.length.toString()}
          hint={page.t('tasks.hints.publishedTasks') || 'currently visible active tasks'}
        />
        <MetricCard
          label={page.t('tasks.metrics.targetedTokens')}
          value={page.metrics.totalTargets.toString()}
          hint={page.t('tasks.hints.targetedTokens') || 'explicit token assignments'}
        />
        <MetricCard
          label={page.t('tasks.metrics.completedTargets')}
          value={page.metrics.completedTargets.toString()}
          hint={page.t('tasks.hints.completedTargets') || 'token-linked run records'}
        />
        <MetricCard
          label={page.t('tasks.metrics.feedbackRecords')}
          value={page.metrics.totalFeedback.toString()}
          hint={page.t('tasks.hints.feedbackRecords') || 'human review notes on finished work'}
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
              {page.metrics.completedTargetsAwaitingFeedback} completed target
              {page.metrics.completedTargetsAwaitingFeedback === 1 ? '' : 's'} awaiting feedback
            </Badge>
            <Badge variant="info">
              {page.metrics.inFlightTasksCount} in-flight task
              {page.metrics.inFlightTasksCount === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              value="all"
              active={page.selectedTaskFilter === 'all'}
              onSelect={page.setSelectedTaskFilter}
              label="All tasks"
            />
            <FilterButton
              value="needs_feedback"
              active={page.selectedTaskFilter === 'needs_feedback'}
              onSelect={page.setSelectedTaskFilter}
              label="Needs feedback"
            />
            <FilterButton
              value="in_flight"
              active={page.selectedTaskFilter === 'in_flight'}
              onSelect={page.setSelectedTaskFilter}
              label="In flight"
            />
          </div>
        </div>
      </Card>

      {page.selectedTask ? (
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              Focused task
            </p>
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {page.selectedTask.task.title}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {page.selectedTask.targets.length} targeted access token
              {page.selectedTask.targets.length === 1 ? '' : 's'} linked to this remote-access task.
            </p>
          </div>
        </Card>
      ) : null}

      <ManagementPageAlerts
        shouldShowSessionExpired={page.shouldShowSessionExpired}
        shouldShowForbidden={page.shouldShowForbidden}
        refreshError={page.refreshError}
        gateError={page.gateError}
        error={page.error}
        dataError={page.dataError}
        sessionExpiredMessage={page.t('tasks.sessionExpired')}
        forbiddenMessage={page.t('tasks.sessionForbidden')}
        dataErrorMessage={page.t('tasks.errors.loadFailed')}
      />

      {page.gateLoading || page.isLoading ? (
        <Card className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {page.t('tasks.loading')}
        </Card>
      ) : null}

      {!page.gateLoading && !page.isLoading && page.taskViews.length === 0 ? (
        <Card variant="feature" className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-500)]">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {page.t('tasks.empty.title')}
            </h2>
            <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {page.t('tasks.empty.description')}
            </p>
          </div>
        </Card>
      ) : null}

      {!page.gateLoading &&
      !page.isLoading &&
      page.taskViews.length > 0 &&
      page.visibleTaskViews.length === 0 ? (
        <Card className="dark:bg-[var(--kw-dark-surface)]/80 border border-dashed border-[var(--kw-border)] bg-white/80 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
          No tasks match the current supervision filter.
        </Card>
      ) : null}

      <div className="grid gap-5" role="list">
        {page.visibleTaskViews.map(({ task, targets }) => (
          <TaskCard
            key={task.id}
            taskView={{ task, targets }}
            isFocused={task.id === page.selectedTaskId}
            onSelect={page.setSelectedTaskId}
            t={page.t}
          />
        ))}
      </div>

      <CreateTaskModal form={form} allTokens={page.allTokens} />
      <TaskDetailModal
        page={page}
        form={form}
      />
      <FeedbackModal form={form} />
    </div>
  );
});

function TaskCard({
  taskView,
  isFocused,
  onSelect,
  t,
}: {
  taskView: TaskView;
  isFocused: boolean;
  onSelect: (id: string) => void;
  t: (key: string) => string;
}) {
  const { task, targets } = taskView;
  const feedbackItems = targets.flatMap((target) => target.feedback);
  const averageScore =
    feedbackItems.length > 0
      ? feedbackItems.reduce((total, item) => total + item.score, 0) / feedbackItems.length
      : null;

  const handleClick = useCallback(() => {
    onSelect(task.id);
  }, [onSelect, task.id]);

  return (
    <Card
      data-testid={`task-card-${task.id}`}
      data-focus-state={isFocused ? 'focused' : 'default'}
      variant="kawaii"
      hover
      className={cn(
        'cursor-pointer space-y-4',
        isFocused &&
          'ring-[var(--kw-primary-400)]/20 border-[var(--kw-primary-400)] ring-1 dark:border-[var(--kw-primary-400)]'
      )}
      onClick={handleClick}
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

        <div className="grid min-w-0 gap-2 rounded-3xl border border-[var(--kw-border)] bg-white/80 dark:bg-[var(--kw-dark-surface)]/80 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {t('tasks.feedbackSummary')}
          </p>
          <p className="text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {feedbackItems.length > 0
              ? `${feedbackItems.length} ${t('tasks.reviews') || 'reviews'} • ${t('tasks.avg') || 'avg'} ${averageScore !== null && averageScore !== undefined ? averageScore.toFixed(1) : '—'}`
              : t('tasks.noFeedback')}
          </p>
          <p className="text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {targets.filter((target) => target.status === 'completed').length}/{targets.length}{' '}
            {t('tasks.targetsCompleted') || 'targets completed'}
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
}

function CreateTaskModal({
  form,
  allTokens,
}: {
  form: ReturnType<typeof useTasksForm>;
  allTokens: { id: string; displayName: string; agentId: string; trustScore?: number }[];
}) {
  return (
    <Modal
      isOpen={form.showCreateTaskModal}
      onClose={form.closeCreateTaskModal}
      title={form.t('tasks.publishTask')}
      description={form.t('tasks.publishTaskDescription')}
      size="lg"
    >
      <form className="space-y-4" onSubmit={form.handleCreateTask}>
        <Input
          label={form.t('tasks.form.title')}
          value={form.taskForm.title}
          onChange={(event) =>
            form.setTaskForm((current) => ({ ...current, title: event.target.value }))
          }
          placeholder={form.t('tasks.form.titlePlaceholder')}
          required
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={form.t('tasks.form.taskType')}
            value={form.taskForm.task_type}
            onChange={(event) =>
              form.setTaskForm((current) => ({ ...current, task_type: event.target.value }))
            }
            placeholder={form.t('tasks.form.taskTypePlaceholder') || 'config_sync'}
            required
          />
          <div>
            <label
              htmlFor="task-priority"
              className="mb-1.5 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
            >
              {form.t('tasks.form.priority')}
            </label>
            <select
              id="task-priority"
              className="w-full rounded-2xl border-2 border-[var(--kw-primary-200)] bg-white dark:bg-[var(--kw-dark-bg)] px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)]"
              value={form.taskForm.priority}
              onChange={(event) =>
                form.setTaskForm((current) => ({ ...current, priority: event.target.value }))
              }
            >
              <option value="low">{form.t('tasks.priorities.low')}</option>
              <option value="normal">{form.t('tasks.priorities.normal')}</option>
              <option value="high">{form.t('tasks.priorities.high')}</option>
              <option value="critical">{form.t('tasks.priorities.critical')}</option>
            </select>
          </div>
        </div>

        <Textarea
          label={form.t('tasks.form.inputPayload')}
          value={form.taskForm.input_json}
          onChange={(event) =>
            form.setTaskForm((current) => ({ ...current, input_json: event.target.value }))
          }
          className="min-h-[180px] font-mono text-sm"
        />

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {form.t('tasks.form.targetMode')}
            </p>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {form.t('tasks.form.targetModeDescription')}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => form.setTargetMode('explicit_tokens')}
              aria-pressed={form.taskForm.target_mode === 'explicit_tokens'}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                form.taskForm.target_mode === 'explicit_tokens'
                  ? 'border-[var(--kw-primary-300)] bg-[var(--kw-primary-50)]'
                  : 'border-[var(--kw-border)] bg-white dark:bg-[var(--kw-dark-bg)]'
              }`}
            >
              <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {form.t('tasks.form.explicitTokens')}
              </p>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {form.t('tasks.form.explicitTokensDesc')}
              </p>
            </button>
            <button
              type="button"
              onClick={() => form.setTargetMode('broadcast')}
              aria-pressed={form.taskForm.target_mode === 'broadcast'}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                form.taskForm.target_mode === 'broadcast'
                  ? 'border-[var(--kw-primary-300)] bg-[var(--kw-primary-50)]'
                  : 'border-[var(--kw-border)] bg-white dark:bg-[var(--kw-dark-bg)]'
              }`}
            >
              <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {form.t('tasks.form.broadcast')}
              </p>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {form.t('tasks.form.broadcastDesc')}
              </p>
            </button>
          </div>
        </div>

        {form.taskForm.target_mode === 'explicit_tokens' ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {form.t('tasks.form.targetTokens')}
              </p>
              <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {form.t('tasks.form.targetTokensDescription')}
              </p>
            </div>
            <div className="bg-[var(--kw-primary-50)]/30 grid max-h-64 gap-3 overflow-y-auto rounded-3xl border border-[var(--kw-border)] p-4">
              {allTokens.length === 0 ? (
                <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {form.t('tasks.form.noTokensAvailable')}
                </p>
              ) : (
                allTokens.map((token) => (
                  <TokenCheckbox
                    key={token.id}
                    token={token}
                    checked={form.taskForm.target_token_ids.includes(token.id)}
                    onToggle={form.toggleTargetToken}
                    t={form.t}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}

        {form.taskFormError ? (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] px-4 py-3 text-sm text-[var(--kw-rose-text)]"
          >
            {form.taskFormError}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={form.closeCreateTaskModal}>
            {form.t('common.cancel')}
          </Button>
          <Button type="submit" loading={form.submittingTask}>
            {form.t('tasks.publishTask')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TaskDetailModal({
  page,
  form,
}: {
  page: ReturnType<typeof useTasksPage>;
  form: ReturnType<typeof useTasksForm>;
}) {
  const task = page.selectedTask;

  const handleLeaveFeedback = useCallback(
    (target: TaskView['targets'][number]) => {
      form.openFeedbackModal({
        taskId: task!.task.id,
        taskTitle: task!.task.title,
        targetId: target.targetId,
        tokenLabel: target.token?.displayName ?? target.tokenId,
      });
    },
    [form, task]
  );

  return (
    <Modal
      isOpen={task !== null}
      onClose={() => page.setSelectedTaskId(null)}
      title={task?.task.title}
      description={task ? `${task.task.taskType} • ${task.task.id}` : undefined}
      size="xl"
    >
      {task ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={priorityVariant(task.task.priority)}>{task.task.priority}</Badge>
            <Badge
              variant={
                task.task.status === 'completed'
                  ? 'success'
                  : task.task.status === 'claimed'
                    ? 'warning'
                    : 'info'
              }
            >
              {task.task.status}
            </Badge>
            <Badge variant={task.task.publicationStatus === 'active' ? 'primary' : 'warning'}>
              {task.task.publicationStatus}
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-3 border border-[var(--kw-border)] bg-white/90">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {page.t('tasks.inputPayload')}
              </p>
              <pre className="overflow-x-auto rounded-2xl bg-[var(--kw-dark-bg)] px-4 py-4 text-sm text-[var(--kw-primary-50)]">
                {JSON.stringify(task.task.input ?? {}, null, 2)}
              </pre>
            </Card>

            <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-3 border border-[var(--kw-border)] bg-white/90">
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {page.t('tasks.publishingContext')}
              </p>
              <div className="space-y-2 text-sm text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                <p>
                  {page.t('tasks.actor')}: {task.task.createdBy.type}:{task.task.createdBy.id}
                </p>
                <p>
                  {page.t('tasks.viaToken')}:{' '}
                  {task.task.createdViaTokenId ?? page.t('tasks.directHumanPublish')}
                </p>
                <p>
                  {page.t('tasks.claimedBy')}: {task.task.claimedBy ?? page.t('tasks.notClaimed')}
                </p>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {page.t('tasks.perTokenStatus')}
              </h3>
              <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {task.targets.filter((target) => target.status === 'completed').length}/
                {task.targets.length} {page.t('tasks.completed') || 'completed'}
              </p>
            </div>

            <div className="grid gap-3">
              {task.targets.map((target) => (
                <Card
                  key={target.targetId}
                  className="bg-[var(--kw-primary-50)]/30 space-y-4 border border-[var(--kw-border)]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={targetStatusVariant(target.status)}>{target.status}</Badge>
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

                    <FeedbackButton
                      target={target}
                      onLeaveFeedback={handleLeaveFeedback}
                      disabled={target.run === null}
                      t={page.t}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <DetailStat
                      label={page.t('tasks.runResult')}
                      value={
                        target.run?.resultSummary ??
                        (target.status === 'pending'
                          ? page.t('tasks.waitingToRun')
                          : page.t('tasks.claimedNotCompleted'))
                      }
                    />
                    <DetailStat
                      label={page.t('tasks.tokenTrust')}
                      value={
                        target.token
                          ? (target.token.trustScore ?? 0).toFixed(2)
                          : page.t('tasks.unknown')
                      }
                    />
                    <DetailStat
                      label={page.t('tasks.feedbackCount')}
                      value={target.feedback.length.toString()}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {target.feedback.length === 0 ? (
                      <Badge variant="default">{page.t('tasks.noFeedback')}</Badge>
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
  );
}

function FeedbackModal({ form }: { form: ReturnType<typeof useTasksForm> }) {
  return (
    <Modal
      isOpen={form.feedbackTarget !== null}
      onClose={form.closeFeedbackModal}
      title={
        form.feedbackTarget
          ? `${form.t('tasks.feedbackFor')} ${form.feedbackTarget.tokenLabel}`
          : form.t('tasks.feedback')
      }
      description={
        form.feedbackTarget
          ? `${form.feedbackTarget.taskTitle} • ${form.feedbackTarget.targetId}`
          : undefined
      }
    >
      <form className="space-y-4" onSubmit={form.handleSubmitFeedback}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="feedback-score"
              className="mb-1.5 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
            >
              {form.t('tasks.form.score')}
            </label>
            <select
              id="feedback-score"
              className="w-full rounded-2xl border-2 border-[var(--kw-primary-200)] bg-white dark:bg-[var(--kw-dark-bg)] px-4 py-3 text-base outline-none focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)]"
              value={form.feedbackForm.score}
              onChange={(event) =>
                form.setFeedbackForm((current) => ({ ...current, score: event.target.value }))
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
            label={form.t('tasks.form.verdict')}
            value={form.feedbackForm.verdict}
            onChange={(event) =>
              form.setFeedbackForm((current) => ({ ...current, verdict: event.target.value }))
            }
            placeholder={form.t('tasks.form.verdictPlaceholder') || 'accepted'}
            required
          />
        </div>

        <Textarea
          label={form.t('tasks.form.summary')}
          value={form.feedbackForm.summary}
          onChange={(event) =>
            form.setFeedbackForm((current) => ({ ...current, summary: event.target.value }))
          }
          className="min-h-[140px]"
          placeholder={form.t('tasks.form.summaryPlaceholder')}
        />

        {form.feedbackFormError ? (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="rounded-2xl border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)] px-4 py-3 text-sm text-[var(--kw-rose-text)]"
          >
            {form.feedbackFormError}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={form.closeFeedbackModal}>
            {form.t('common.cancel')}
          </Button>
          <Button type="submit" loading={form.submittingFeedback}>
            {form.t('tasks.saveFeedback')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TokenCheckbox({
  token,
  checked,
  onToggle,
  t,
}: {
  token: { id: string; displayName: string; agentId: string; trustScore?: number };
  checked: boolean;
  onToggle: (id: string) => void;
  t: (key: string) => string;
}) {
  const handleChange = useCallback(() => {
    onToggle(token.id);
  }, [onToggle, token.id]);

  return (
    <label className="flex items-start gap-3 rounded-2xl border border-[var(--kw-border)] bg-white dark:bg-[var(--kw-dark-bg)] px-4 py-3">
      <input type="checkbox" className="mt-1" checked={checked} onChange={handleChange} />
      <div>
        <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
          {token.displayName}
        </p>
        <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {token.id} • {token.agentId} • {t('tasks.form.trust') || 'trust'} {(token.trustScore ?? 0).toFixed(2)}
        </p>
      </div>
    </label>
  );
}

function FeedbackButton({
  target,
  onLeaveFeedback,
  disabled,
  t,
}: {
  target: TaskView['targets'][number];
  onLeaveFeedback: (target: TaskView['targets'][number]) => void;
  disabled: boolean;
  t: (key: string) => string;
}) {
  const handleClick = useCallback(() => {
    onLeaveFeedback(target);
  }, [onLeaveFeedback, target]);

  return (
    <Button variant="secondary" size="sm" onClick={handleClick} disabled={disabled}>
      <MessageSquarePlus className="mr-2 h-4 w-4" />
      {t('tasks.leaveFeedback')}
    </Button>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[var(--kw-dark-bg)] px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {value}
      </p>
    </div>
  );
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

function targetStatusVariant(status: TaskView['targets'][number]['status']) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'claimed':
      return 'warning';
    default:
      return 'default';
  }
}
