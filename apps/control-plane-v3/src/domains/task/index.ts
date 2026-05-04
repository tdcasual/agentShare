/**
 * Task Domain
 *
 * 导出：
 * - 类型定义
 * - API 函数
 * - React Hooks
 */

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

export {
  taskApi,
  getTasks,
  createTask,
  getRuns,
  createTaskTargetFeedback,
  getAccessTokenFeedback,
  getAccessTokenFeedbackBulk,
} from './api';

export { useTaskDashboard, type TaskView } from './hooks-dashboard';

export {
  useTasks,
  useCreateTask,
  useRuns,
  useAccessTokenFeedback,
  useCreateTaskTargetFeedback,
  refreshTasks,
  refreshRuns,
  prefetchTasks,
  prefetchRuns,
} from './hooks';
