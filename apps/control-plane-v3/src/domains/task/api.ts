/**
 * Task Domain API
 *
 * 负责：
 * - Task CRUD
 * - Run 管理
 * - Token Feedback
 */

import { apiFetch, TaskCreateInput, TokenFeedbackCreateInput } from '@/lib/api-client';
import {
  normalizeRun,
  normalizeTask,
  normalizeTokenFeedback,
  type RunTransport,
  type TaskTransport,
  type TokenFeedbackTransport,
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

export function createTaskTargetFeedback(targetId: string, payload: TokenFeedbackCreateInput) {
  return apiFetch<TokenFeedbackTransport>(`/task-targets/${targetId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(normalizeTokenFeedback);
}

export function getTokenFeedback(tokenId: string) {
  return apiFetch<{ items: TokenFeedbackTransport[] }>(`/agent-tokens/${tokenId}/feedback`).then(
    ({ items }) => ({
      items: items.map(normalizeTokenFeedback),
    })
  );
}

export function getTokenFeedbackBulk(tokenIds: string[]) {
  const params = new URLSearchParams();
  tokenIds.forEach((tokenId) => params.append('token_id', tokenId));
  return apiFetch<{ items_by_token: Record<string, TokenFeedbackTransport[]> }>(
    `/token-feedback/bulk?${params.toString()}`
  ).then(({ items_by_token }) => ({
    items_by_token: Object.fromEntries(
      Object.entries(items_by_token).map(([tokenId, items]) => [
        tokenId,
        items.map(normalizeTokenFeedback),
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
  getTokenFeedback,
  getTokenFeedbackBulk,
};
