import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { translateMessage } from '@/test-utils/i18n-mock';
import TasksPage from './page';

const t = translateMessage;

let mockSearchParams = new URLSearchParams();
const useManagementSessionGateMock = vi.fn();
const useTaskDashboardMock = vi.fn();
const useCreateTaskMock = vi.fn();
const useCreateTaskTargetFeedbackMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const createTaskActionMock = vi.fn();
const createFeedbackActionMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
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
          taskType: 'config_sync',
          priority: 'normal',
          status: 'pending',
          publicationStatus: 'active',
          targetMode: 'explicit_tokens',
          input: {},
          createdBy: { id: 'owner', type: 'human', name: 'Owner' },
          targetIds: ['target-1'],
          targetTokenIds: ['token-1'],
          requiredCapabilityIds: [],
          playbookIds: [],
          leaseAllowed: false,
          approvalRules: [],
        },
        {
          id: 'task-2',
          title: 'Run Risk Scan',
          taskType: 'risk_scan',
          priority: 'high',
          status: 'completed',
          publicationStatus: 'active',
          targetMode: 'explicit_tokens',
          input: {},
          createdBy: { id: 'owner', type: 'human', name: 'Owner' },
          targetIds: ['target-2'],
          targetTokenIds: ['token-2'],
          requiredCapabilityIds: [],
          playbookIds: [],
          leaseAllowed: false,
          approvalRules: [],
        },
      ],
      runs: [
        {
          id: 'run-2',
          taskId: 'task-2',
          taskTargetId: 'target-2',
          tokenId: 'token-2',
          status: 'completed',
          resultSummary: 'Risk scan finished with notes',
        },
      ],
      tokensById: {
        'token-1': {
          id: 'token-1',
          displayName: 'Primary Token',
          agentId: 'bootstrap',
          trustScore: 0.82,
          status: 'active',
          scopes: [],
          labels: {},
        },
        'token-2': {
          id: 'token-2',
          displayName: 'Risk Scan Token',
          agentId: 'analyzer',
          trustScore: 0.55,
          status: 'active',
          scopes: [],
          labels: {},
        },
      },
      feedbackByTargetId: {},
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    createTaskActionMock.mockResolvedValue({ id: 'task-new' });
    createFeedbackActionMock.mockResolvedValue({ id: 'feedback-new' });
    useCreateTaskMock.mockReturnValue(createTaskActionMock);
    useCreateTaskTargetFeedbackMock.mockReturnValue(createFeedbackActionMock);
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

    await user.click(screen.getByRole('button', { name: t('common.refresh') }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tasks.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when task queries return unauthorized', () => {
    useTaskDashboardMock.mockReturnValue({
      ...useTaskDashboardMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<TasksPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('tasks.sessionExpired'));
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a forbidden-specific state when task queries return forbidden', () => {
    useTaskDashboardMock.mockReturnValue({
      ...useTaskDashboardMock(),
      error: new ApiError(403, 'Forbidden'),
    });

    render(<TasksPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('tasks.sessionForbidden'));
  });

  it('surfaces feedback follow-up metrics and filters tasks that still need review', async () => {
    const user = userEvent.setup();

    render(<TasksPage />);

    expect(
      screen.getByText(t('tasks.supervision.completedTargetsAwaitingFeedback', { count: 1 }))
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: t('tasks.supervision.filters.needsFeedback') })
    );

    expect(screen.queryByText('Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Run Risk Scan')).toBeInTheDocument();
  });

  it('filters tasks by in-flight execution state', async () => {
    const user = userEvent.setup();

    render(<TasksPage />);

    await user.click(screen.getByRole('button', { name: t('tasks.supervision.filters.inFlight') }));

    expect(screen.getByText('Sync Config')).toBeInTheDocument();
    expect(screen.queryByText('Run Risk Scan')).not.toBeInTheDocument();
  });

  it('highlights a focused task from the query string', () => {
    mockSearchParams = new URLSearchParams('taskId=task-2');

    render(<TasksPage />);

    expect(screen.getByText(t('tasks.focusedTask.title'))).toBeInTheDocument();
    expect(screen.getByTestId('task-card-task-2')).toHaveAttribute('data-focus-state', 'focused');
    expect(screen.getByTestId('task-card-task-1')).toHaveAttribute('data-focus-state', 'default');
  });

  it('shows a relogin recovery state when publish task hits an expired session', async () => {
    const user = userEvent.setup();
    createTaskActionMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<TasksPage />);

    await user.click(screen.getByRole('button', { name: t('tasks.publishTask') }));
    await user.type(
      screen.getByPlaceholderText(t('tasks.form.titlePlaceholder')),
      'Ship config sync'
    );
    await user.type(
      screen.getByPlaceholderText(t('tasks.form.taskTypePlaceholder')),
      'config_sync'
    );
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.click(screen.getAllByRole('button', { name: t('tasks.publishTask') })[1]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tasks.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when saving feedback hits an expired session', async () => {
    const user = userEvent.setup();
    createFeedbackActionMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<TasksPage />);

    await user.click(screen.getByTestId('task-card-task-2'));
    await user.click(screen.getByRole('button', { name: t('tasks.leaveFeedback') }));
    await user.type(
      screen.getByPlaceholderText(t('tasks.form.summaryPlaceholder')),
      'Needs a clearer risk summary.'
    );
    await user.click(screen.getByRole('button', { name: t('tasks.saveFeedback') }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tasks.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});
