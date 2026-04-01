import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import TasksPage from './page';

let mockSearchParams = new URLSearchParams();
const useManagementSessionGateMock = vi.fn();
const useTaskDashboardMock = vi.fn();
const useCreateTaskMock = vi.fn();
const useCreateTaskTargetFeedbackMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/task', () => ({
  useTaskDashboard: () => useTaskDashboardMock(),
  useCreateTask: () => useCreateTaskMock(),
  useCreateTaskTargetFeedback: () => useCreateTaskTargetFeedbackMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAgentsWithTokens: () => useAgentsWithTokensMock(),
}));

describe('tasks page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    useManagementSessionGateMock.mockReturnValue({
      session: {
        email: 'owner@example.com',
        role: 'owner',
      },
      loading: false,
      error: null,
    });

    useTaskDashboardMock.mockReturnValue({
      tasks: [
        {
          id: 'task-1',
          title: 'Sync Config',
          task_type: 'config_sync',
          taskType: 'config_sync',
          priority: 'normal',
          status: 'pending',
          publication_status: 'active',
          publicationStatus: 'active',
          created_by_actor_type: 'human',
          created_by_actor_id: 'owner',
          target_token_ids: ['token-1'],
        },
        {
          id: 'task-2',
          title: 'Run Risk Scan',
          task_type: 'risk_scan',
          taskType: 'risk_scan',
          priority: 'high',
          status: 'completed',
          publication_status: 'active',
          publicationStatus: 'active',
          created_by_actor_type: 'human',
          created_by_actor_id: 'owner',
          target_token_ids: ['token-2'],
        },
      ],
      runs: [
        {
          id: 'run-2',
          task_id: 'task-2',
          task_target_id: 'task-2:token-2',
          token_id: 'token-2',
          status: 'completed',
          result_summary: 'Risk scan finished with notes',
        },
      ],
      tokensById: {
        'token-1': {
          id: 'token-1',
          display_name: 'Primary Token',
          agent_id: 'bootstrap',
          trust_score: 0.82,
        },
        'token-2': {
          id: 'token-2',
          display_name: 'Risk Scan Token',
          agent_id: 'analyzer',
          trust_score: 0.55,
        },
      },
      feedbackByTargetId: {},
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useCreateTaskMock.mockReturnValue(vi.fn());
    useCreateTaskTargetFeedbackMock.mockReturnValue(vi.fn());
    useAgentsWithTokensMock.mockReturnValue({
      agents: [],
      tokensByAgent: {},
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    const mutateMock = vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'));

    useTaskDashboardMock.mockReturnValue({
      ...useTaskDashboardMock(),
      mutate: mutateMock,
    });

    render(<TasksPage />);

    await user.click(screen.getByRole('button', { name: /common.refresh/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a relogin recovery state when task queries return unauthorized', () => {
    useTaskDashboardMock.mockReturnValue({
      ...useTaskDashboardMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<TasksPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('surfaces feedback follow-up metrics and filters tasks that still need review', async () => {
    const user = userEvent.setup();

    render(<TasksPage />);

    expect(screen.getByText('1 completed target awaiting feedback')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /needs feedback/i }));

    expect(screen.queryByText('Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Run Risk Scan')).toBeInTheDocument();
  });

  it('filters tasks by in-flight execution state', async () => {
    const user = userEvent.setup();

    render(<TasksPage />);

    await user.click(screen.getByRole('button', { name: /in flight/i }));

    expect(screen.getByText('Sync Config')).toBeInTheDocument();
    expect(screen.queryByText('Run Risk Scan')).not.toBeInTheDocument();
  });

  it('highlights a focused task from the query string', () => {
    mockSearchParams = new URLSearchParams('taskId=task-2');

    render(<TasksPage />);

    expect(screen.getByText('Focused task')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-task-2')).toHaveAttribute('data-focus-state', 'focused');
    expect(screen.getByTestId('task-card-task-1')).toHaveAttribute('data-focus-state', 'default');
  });
});
