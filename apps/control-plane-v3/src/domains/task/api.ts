/**
 * Task Domain API
 *
 * 负责：
 * - Task CRUD
 * - Run 管理
 * - Access token feedback
 */

import { apiFetch, TaskCreateInput, AccessTokenFeedbackCreateInput } from '@/lib/api-client';
import {
  normalizeAccessTokenFeedback,
  normalizeRun,
  normalizeTask,
  type RunTransport,
  type TaskTransport,
  type AccessTokenFeedbackTransport,
} from './types';

// ============================================
// Tasks
// ============================================

export function getTasks() {
  return apiFetch<{ items: TaskTransport[] }>('/tasks').then(({ items }) => ({
    items: items.map(normalizeTask),
  }));
}

export function createTask(payload: TaskCreateInput) {
  return apiFetch<TaskTransport>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(normalizeTask);
}

// ============================================
// Runs
// ============================================

export function getRuns() {
  return apiFetch<{ items: RunTransport[] }>('/runs').then(({ items }) => ({
    items: items.map(normalizeRun),
  }));
}

// ============================================
// Feedback
// ============================================

export function createTaskTargetFeedback(
  targetId: string,
  payload: AccessTokenFeedbackCreateInput
) {
  return apiFetch<AccessTokenFeedbackTransport>(`/task-targets/${targetId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(normalizeAccessTokenFeedback);
}

export function getAccessTokenFeedback(accessTokenId: string) {
  return apiFetch<{ items: AccessTokenFeedbackTransport[] }>(
    `/access-tokens/${accessTokenId}/feedback`
  ).then(({ items }) => ({
    items: items.map(normalizeAccessTokenFeedback),
  }));
}

export function getAccessTokenFeedbackBulk(accessTokenIds: string[]) {
  const params = new URLSearchParams();
  accessTokenIds.forEach((accessTokenId) => params.append('access_token_id', accessTokenId));
  return apiFetch<{ items_by_access_token: Record<string, AccessTokenFeedbackTransport[]> }>(
    `/access-token-feedback/bulk?${params.toString()}`
  ).then(({ items_by_access_token }) => ({
    items_by_access_token: Object.fromEntries(
      Object.entries(items_by_access_token).map(([accessTokenId, items]) => [
        accessTokenId,
        items.map(normalizeAccessTokenFeedback),
      ])
    ),
  }));
}

// ============================================
// 向后兼容的 API 对象
// ============================================

export const taskApi = {
  // Tasks
  getTasks,
  createTask,
  // Runs
  getRuns,
  // Feedback
  createTaskTargetFeedback,
  getAccessTokenFeedback,
  getAccessTokenFeedbackBulk,
};
