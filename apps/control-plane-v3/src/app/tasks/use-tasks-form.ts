'use client';

import { useState, useCallback, FormEvent } from 'react';
import { ApiError } from '@/lib/api-client';
import { useI18n } from '@/components/i18n-provider';
import type { useCreateTask, useCreateTaskTargetFeedback } from '@/domains/task';

type CreateTaskFn = ReturnType<typeof useCreateTask>;
type CreateFeedbackFn = ReturnType<typeof useCreateTaskTargetFeedback>;

export interface FeedbackTargetState {
  taskId: string;
  taskTitle: string;
  targetId: string;
  tokenLabel: string;
}

export interface TaskFormState {
  title: string;
  task_type: string;
  priority: string;
  target_mode: 'explicit_tokens' | 'broadcast';
  target_token_ids: string[];
  input_json: string;
}

function parseJsonObject(raw: string, invalidPayloadMessage: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(invalidPayloadMessage);
  }
  return parsed as Record<string, unknown>;
}

export function useTasksForm({
  createTask,
  createFeedback,
  consumeUnauthorized,
  clearAllAuthErrors,
  onTaskCreated,
  onFeedbackCreated,
}: {
  createTask: CreateTaskFn;
  createFeedback: CreateFeedbackFn;
  consumeUnauthorized: (error: unknown) => boolean;
  clearAllAuthErrors: () => void;
  onTaskCreated?: () => void;
  onFeedbackCreated?: () => void;
}) {
  const { t } = useI18n();

  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
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

  const resetTaskForm = useCallback(() => {
    setTaskForm({
      title: '',
      task_type: 'account_read',
      priority: 'normal',
      target_mode: 'explicit_tokens',
      target_token_ids: [],
      input_json: '{\n  "provider": "github"\n}',
    });
    setTaskFormError(null);
  }, []);

  const resetFeedbackForm = useCallback(() => {
    setFeedbackForm({ score: '5', verdict: 'accepted', summary: '' });
    setFeedbackFormError(null);
  }, []);

  const openCreateTaskModal = useCallback(() => {
    resetTaskForm();
    setShowCreateTaskModal(true);
  }, [resetTaskForm]);

  const closeCreateTaskModal = useCallback(() => {
    setShowCreateTaskModal(false);
  }, []);

  const openFeedbackModal = useCallback(
    (target: FeedbackTargetState) => {
      resetFeedbackForm();
      setFeedbackTarget(target);
    },
    [resetFeedbackForm]
  );

  const closeFeedbackModal = useCallback(() => {
    setFeedbackTarget(null);
  }, []);

  const toggleTargetToken = useCallback((tokenId: string) => {
    setTaskForm((current) => ({
      ...current,
      target_token_ids: current.target_token_ids.includes(tokenId)
        ? current.target_token_ids.filter((item) => item !== tokenId)
        : [...current.target_token_ids, tokenId],
    }));
  }, []);

  const setTargetMode = useCallback((mode: 'explicit_tokens' | 'broadcast') => {
    setTaskForm((current) => ({
      ...current,
      target_mode: mode,
      target_token_ids: mode === 'broadcast' ? [] : current.target_token_ids,
    }));
  }, []);

  const handleCreateTask = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmittingTask(true);
      setTaskFormError(null);
      clearAllAuthErrors();

      try {
        const parsedInput = parseJsonObject(taskForm.input_json, t('tasks.errors.invalidPayload'));
        if (taskForm.target_mode === 'explicit_tokens' && taskForm.target_token_ids.length === 0) {
          throw new Error(t('tasks.errors.noTargetTokens'));
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

        resetTaskForm();
        setShowCreateTaskModal(false);
        onTaskCreated?.();
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
    },
    [createTask, consumeUnauthorized, clearAllAuthErrors, onTaskCreated, t, taskForm, resetTaskForm]
  );

  const handleSubmitFeedback = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!feedbackTarget) {
        return;
      }

      setSubmittingFeedback(true);
      setFeedbackFormError(null);
      clearAllAuthErrors();

      try {
        await createFeedback(feedbackTarget.targetId, {
          score: Number(feedbackForm.score),
          verdict: feedbackForm.verdict.trim(),
          summary: feedbackForm.summary.trim(),
        });

        resetFeedbackForm();
        setFeedbackTarget(null);
        onFeedbackCreated?.();
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
    },
    [
      createFeedback,
      consumeUnauthorized,
      clearAllAuthErrors,
      onFeedbackCreated,
      t,
      feedbackTarget,
      feedbackForm,
      resetFeedbackForm,
    ]
  );

  return {
    t,
    showCreateTaskModal,
    openCreateTaskModal,
    closeCreateTaskModal,
    feedbackTarget,
    openFeedbackModal,
    closeFeedbackModal,
    taskForm,
    setTaskForm,
    feedbackForm,
    setFeedbackForm,
    taskFormError,
    feedbackFormError,
    submittingTask,
    submittingFeedback,
    toggleTargetToken,
    setTargetMode,
    handleCreateTask,
    handleSubmitFeedback,
  };
}
