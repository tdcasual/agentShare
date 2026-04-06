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
  TokenFeedback,
  FeedbackVerdict,
  CreateFeedbackInput,
  AgentToken,
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
  getTokenFeedback,
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
  useTokenFeedback,
  useCreateTaskTargetFeedback,
  // Manual mutations
  refreshTasks,
  refreshRuns,
  // Prefetch
  prefetchTasks,
  prefetchRuns,
} from './hooks';
