import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import RunsPage from './page';

const useManagementSessionGateMock = vi.fn();
const useRunsMock = vi.fn();
const refreshRunsMock = vi.fn();

vi.mock('@/components/route-guard', () => ({
  ManagementRouteGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/task/hooks', () => ({
  useRuns: (...args: unknown[]) => useRunsMock(...args),
}));

describe('runs page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useManagementSessionGateMock.mockReturnValue({
      session: { email: 'viewer@example.com', role: 'viewer' },
      loading: false,
      error: null,
    });
    useRunsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'run-pending-12345678',
            task_id: 'task-pending-12345678',
            agent_id: 'agent-pending-12345678',
            token_id: 'token-pending-12345678',
            task_target_id: 'target-pending-12345678',
            status: 'pending',
          },
          {
            id: 'run-completed-87654321',
            task_id: 'task-completed-87654321',
            agent_id: 'agent-completed-87654321',
            token_id: 'token-completed-87654321',
            task_target_id: 'target-completed-87654321',
            status: 'completed',
            result_summary: 'Run finished successfully',
            output_payload: { ok: true },
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: refreshRunsMock,
    });
    refreshRunsMock.mockResolvedValue(undefined);
  });

  it('renders the runs page with backend run data', () => {
    render(<RunsPage />);

    expect(screen.getByRole('heading', { name: /运行观测/i })).toBeInTheDocument();
    expect(screen.getByText(/Run #12345678/i)).toBeInTheDocument();
    expect(screen.getByText(/Run #87654321/i)).toBeInTheDocument();
  });

  it('shows a forbidden-specific state when run queries return forbidden', () => {
    useRunsMock.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: new ApiError(403, 'Forbidden'),
      mutate: vi.fn(),
    });

    render(<RunsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('permission');
  });

  it('filters runs by status from the toolbar', async () => {
    const user = userEvent.setup();

    render(<RunsPage />);

    await user.click(screen.getByRole('button', { name: /已完成 \(1\)/i }));

    expect(screen.getByText(/Run #87654321/i)).toBeInTheDocument();
    expect(screen.queryByText(/Run #12345678/i)).not.toBeInTheDocument();
  });

  it('opens the run detail modal from the list', async () => {
    const user = userEvent.setup();

    render(<RunsPage />);

    await user.click(screen.getByText(/Run #87654321/i));

    expect(screen.getByText(/Run 详情/i)).toBeInTheDocument();
    expect(screen.getByText(/Run finished successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/任务ID/i)).toBeInTheDocument();
  });

  it('shows a relogin recovery state when refreshing runs hits an expired session', async () => {
    const user = userEvent.setup();
    refreshRunsMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<RunsPage />);

    await user.click(screen.getByRole('button', { name: /刷新/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your management session has expired');
  });

  it('shows a refresh error when runs refresh fails for a non-auth reason', async () => {
    const user = userEvent.setup();
    refreshRunsMock.mockRejectedValueOnce(new Error('Run refresh unavailable'));

    render(<RunsPage />);

    await user.click(screen.getByRole('button', { name: /刷新/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Run refresh unavailable');
  });
});
