/**
 * Task Domain
 *
 * 导出：
 * - 类型定义
 * - API 函数
 * - React Hooks
 */

// Types
export type {
  Task,
  TaskStatus,
  TaskPriority,
  PublicationStatus,
  TaskTargetMode,
  TaskInput,
  CreateTaskInput,
  TaskWithTargets,
  TaskTargetView,
  Run,
  RunStatus,
  AccessTokenFeedback,
  FeedbackVerdict,
  CreateFeedbackInput,
  AccessToken,
  TaskEvents,
  TaskQuery,
} from './types';

// API
export {
  taskApi,
  getTasks,
  createTask,
  getRuns,
  createTaskTargetFeedback,
  getAccessTokenFeedback,
  getAccessTokenFeedbackBulk,
} from './api';

// Dashboard hooks
export { useTaskDashboard, type TaskView } from './hooks-dashboard';

// Hooks
export {
  // Tasks
  useTasks,
  useCreateTask,
  // Runs
  useRuns,
  // Feedback
  useAccessTokenFeedback,
  useCreateTaskTargetFeedback,
  // Manual mutations
  refreshTasks,
  refreshRuns,
  // Prefetch
  prefetchTasks,
  prefetchRuns,
} from './hooks';
