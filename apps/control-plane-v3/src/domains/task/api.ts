/**
 * Task Domain API
 *
 * 负责：
 * - Task CRUD
 * - Run 管理
 * - Token Feedback
 */

import { apiFetch, TaskCreateInput, TokenFeedbackCreateInput } from '@/lib/api-client';
import type { Task, Run, TokenFeedback } from './types';

// ============================================
// Tasks
// ============================================

export function getTasks() {
  return apiFetch<{ items: Task[] }>('/tasks');
}

export function createTask(payload: TaskCreateInput) {
  return apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============================================
// Runs
// ============================================

export function getRuns() {
  return apiFetch<{ items: Run[] }>('/runs');
}

// ============================================
// Feedback
// ============================================

export function createTaskTargetFeedback(targetId: string, payload: TokenFeedbackCreateInput) {
  return apiFetch<TokenFeedback>(`/task-targets/${targetId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getTokenFeedback(tokenId: string) {
  return apiFetch<{ items: TokenFeedback[] }>(`/agent-tokens/${tokenId}/feedback`);
}

export function getTokenFeedbackBulk(tokenIds: string[]) {
  const params = new URLSearchParams();
  tokenIds.forEach((tokenId) => params.append('token_id', tokenId));
  return apiFetch<{ items_by_token: Record<string, TokenFeedback[]> }>(
    `/token-feedback/bulk?${params.toString()}`
  );
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
