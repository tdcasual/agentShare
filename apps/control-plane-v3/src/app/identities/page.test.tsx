import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import IdentitiesPage from './page';

let mockSearchParams = new URLSearchParams();
const useManagementSessionGateMock = vi.fn();
const useAdminAccountsMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const useAgentTokensMock = vi.fn();
const useEventsMock = vi.fn();
const useDeleteAgentMock = vi.fn();
const deleteAgentMock = vi.fn();
const refreshSessionMock = vi.fn();
const refreshAdminAccountsMock = vi.fn();
const refreshAgentsMock = vi.fn();
const refreshAgentsWithTokensMock = vi.fn();
const refreshEventsMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/components/route-guard', () => ({
  ManagementRouteGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAdminAccounts: () => useAdminAccountsMock(),
  useAgentsWithTokens: () => useAgentsWithTokensMock(),
  useAgentTokens: (agentId: string | null) => useAgentTokensMock(agentId),
  useDeleteAgent: () => useDeleteAgentMock(),
  refreshSession: () => refreshSessionMock(),
  refreshAdminAccounts: () => refreshAdminAccountsMock(),
  refreshAgents: () => refreshAgentsMock(),
  refreshAgentsWithTokens: () => refreshAgentsWithTokensMock(),
}));

vi.mock('@/domains/event', () => ({
  useEvents: () => useEventsMock(),
  refreshEvents: () => refreshEventsMock(),
}));

describe('identities page', () => {
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

    useAdminAccountsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'admin-owner',
            email: 'owner@example.com',
            display_name: 'Founding Owner',
            role: 'owner',
            status: 'active',
            created_at: '2026-03-31T00:00:00.000Z',
            updated_at: '2026-03-31T00:00:00.000Z',
          },
          {
            id: 'admin-operator',
            email: 'alice@example.com',
            display_name: 'Alice Operator',
            role: 'operator',
            status: 'inactive',
            created_at: '2026-03-31T00:00:00.000Z',
            updated_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useAgentsWithTokensMock.mockReturnValue({
      agents: [
        {
          id: 'bootstrap',
          name: 'Bootstrap Agent',
          risk_tier: 'high',
          auth_method: 'api_key',
          status: 'active',
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
        },
        {
          id: 'analyzer',
          name: 'Analyzer Agent',
          risk_tier: 'medium',
          auth_method: 'oauth',
          status: 'inactive',
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
        },
      ],
      tokensByAgent: {
        bootstrap: [
          {
            id: 'token-bootstrap',
            display_name: 'Bootstrap Primary',
            status: 'active',
            trust_score: 0.92,
            created_at: '2026-03-31T00:00:00.000Z',
          },
        ],
        analyzer: [],
      },
      isLoading: false,
      error: null,
    });

    useAgentTokensMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'token-bootstrap',
            display_name: 'Bootstrap Primary',
            status: 'active',
            trust_score: 0.92,
            created_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useEventsMock.mockReturnValue({
      events: [
        {
          id: 'event-1',
          actor_id: 'bootstrap',
          actor_type: 'agent',
          event_type: 'task_completed',
          subject_type: 'task',
          subject_id: 'task-1',
          summary: 'Bootstrap completed Sync Config',
          details: 'Published follow-up feedback',
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    deleteAgentMock.mockResolvedValue({ status: 'deleted', id: 'bootstrap' });
    useDeleteAgentMock.mockReturnValue(deleteAgentMock);
  });

  it('filters human and agent lists locally from the search query', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    expect(screen.getByText('Alice Operator')).toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search identities/i }), 'analyzer');

    expect(screen.queryByText('Alice Operator')).not.toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();
    expect(screen.getByText(/No human operators match/i)).toBeInTheDocument();
  });

  it('refreshes the management snapshot when refresh is requested', async () => {
    const user = userEvent.setup();
    refreshSessionMock.mockResolvedValue(undefined);
    refreshAdminAccountsMock.mockResolvedValue(undefined);
    refreshAgentsWithTokensMock.mockResolvedValue(undefined);
    refreshEventsMock.mockResolvedValue(undefined);

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /refresh snapshot/i }));

    await waitFor(() => {
      expect(refreshSessionMock).toHaveBeenCalledTimes(1);
      expect(refreshAdminAccountsMock).toHaveBeenCalledTimes(1);
      expect(refreshAgentsWithTokensMock).toHaveBeenCalledTimes(1);
      expect(refreshEventsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('offers a retry action when backend loading fails', async () => {
    const user = userEvent.setup();
    refreshSessionMock.mockResolvedValue(undefined);
    refreshAgentsWithTokensMock.mockResolvedValue(undefined);

    useAgentsWithTokensMock.mockReturnValue({
      agents: [],
      tokensByAgent: {},
      isLoading: false,
      error: new Error('Agents backend unavailable'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Agents backend unavailable');

    await user.click(screen.getByRole('button', { name: /retry agents/i }));

    await waitFor(() => {
      expect(refreshSessionMock).not.toHaveBeenCalled();
      expect(refreshAdminAccountsMock).not.toHaveBeenCalled();
      expect(refreshAgentsWithTokensMock).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the healthy section visible when only agent data fails', async () => {
    useAgentsWithTokensMock.mockReturnValue({
      agents: [],
      tokensByAgent: {},
      isLoading: false,
      error: new Error('Agents backend unavailable'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByText('Founding Owner')).toBeInTheDocument();
    expect(screen.getByText(/Agent data is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Bootstrap Agent')).not.toBeInTheDocument();
  });

  it('reveals operator details when the details toggle is expanded', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /view details for founding owner/i }));

    expect(screen.getByText('Account ID')).toBeInTheDocument();
    expect(screen.getByText('admin-owner')).toBeInTheDocument();
    expect(screen.getByText('Never signed in')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /hide details for founding owner/i })
    ).toBeInTheDocument();
  });

  it('frames humans as supervisors and agents as self-maintained identities', () => {
    render(<IdentitiesPage />);

    expect(
      screen.getByText(/Human operators supervise policy, approvals, and account hygiene/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Agents maintain their own execution identity, while humans can still inspect and manage their status/i
      )
    ).toBeInTheDocument();
  });

  it('shows token and feedback coverage for agents before details are expanded', () => {
    render(<IdentitiesPage />);

    expect(screen.getByText('1 linked token')).toBeInTheDocument();
    expect(screen.getByText('1 recent feedback event')).toBeInTheDocument();
    expect(screen.getByText('0 linked tokens')).toBeInTheDocument();
  });

  it('replaces the demo placeholder with a live supervision coverage summary', () => {
    render(<IdentitiesPage />);

    expect(screen.getByText(/Management coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/Agents with linked tokens/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /try demo version/i })).not.toBeInTheDocument();
  });

  it('shows related tokens and recent events for an expanded agent', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /view details for bootstrap agent/i }));

    expect(screen.getAllByText('Bootstrap Primary').length).toBeGreaterThan(0);
    expect(screen.getByText('Bootstrap completed Sync Config')).toBeInTheDocument();
  });

  it('lets owners delete an agent from the management view', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /view details for bootstrap agent/i }));
    await user.click(screen.getByRole('button', { name: /delete bootstrap agent/i }));

    expect(deleteAgentMock).toHaveBeenCalledWith('bootstrap');
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    refreshSessionMock.mockRejectedValue(new ApiError(401, 'Missing management session'));

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /refresh snapshot/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when backend queries return unauthorized', () => {
    useAgentsWithTokensMock.mockReturnValue({
      agents: [],
      tokensByAgent: {},
      isLoading: false,
      error: new ApiError(401, 'Missing management session'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a forbidden-specific state when backend queries return forbidden', () => {
    useAgentsWithTokensMock.mockReturnValue({
      agents: [],
      tokensByAgent: {},
      isLoading: false,
      error: new ApiError(403, 'Forbidden'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('permission');
  });

  it('highlights and expands the focused agent from the query string', () => {
    mockSearchParams = new URLSearchParams('agentId=bootstrap');

    render(<IdentitiesPage />);

    expect(screen.getByText('Focused identity')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /hide details for bootstrap agent/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('agent-card-bootstrap')).toHaveAttribute(
      'data-focus-state',
      'focused'
    );
  });

  it('offers explicit account and token management handoff actions inside identity details', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /view details for founding owner/i }));
    await user.click(screen.getByRole('button', { name: /view details for bootstrap agent/i }));

    expect(screen.getByRole('link', { name: /manage in settings/i })).toHaveAttribute(
      'href',
      '/settings'
    );
    expect(screen.getByRole('link', { name: /manage tokens/i })).toHaveAttribute('href', '/tokens');
  });
});
