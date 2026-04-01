import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import SpacesPage from './page';

let mockSearchParams = new URLSearchParams();
const useEventsMock = vi.fn();
const useReviewsMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const useSecretsMock = vi.fn();
const useCapabilitiesMock = vi.fn();
const useManagementSessionGateMock = vi.fn();
const useApproveReviewMock = vi.fn();
const useRejectReviewMock = vi.fn();
const approveReviewMock = vi.fn();
const rejectReviewMock = vi.fn();

vi.mock('@/components/route-guard', () => ({
  ManagementRouteGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/event', () => ({
  useEvents: () => useEventsMock(),
}));

vi.mock('@/domains/review', () => ({
  useReviews: () => useReviewsMock(),
  useApproveReview: () => useApproveReviewMock(),
  useRejectReview: () => useRejectReviewMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAgentsWithTokens: () => useAgentsWithTokensMock(),
}));

vi.mock('@/domains/governance', () => ({
  useSecrets: () => useSecretsMock(),
  useCapabilities: () => useCapabilitiesMock(),
}));

describe('spaces page', () => {
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
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
        },
        {
          id: 'event-2',
          actor_id: 'analyzer',
          actor_type: 'agent',
          event_type: 'task_failed',
          subject_type: 'task',
          subject_id: 'task-2',
          summary: 'Analyzer failed Risk Scan',
          created_at: '2026-03-31T00:10:00.000Z',
          updated_at: '2026-03-31T00:10:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    useReviewsMock.mockReturnValue({
      data: {
        items: [
          {
            resource_kind: 'capability',
            resource_id: 'capability-1',
            title: 'agent.market.capability',
            publication_status: 'pending_review',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'bootstrap',
          },
          {
            resource_kind: 'secret',
            resource_id: 'secret-2',
            title: 'rejected.market.secret',
            publication_status: 'rejected',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'analyzer',
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
          status: 'active',
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
        analyzer: [
          {
            id: 'token-analyzer',
            display_name: 'Analyzer Worker',
            status: 'active',
            trust_score: 0.81,
            created_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    useSecretsMock.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });

    useCapabilitiesMock.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });

    approveReviewMock.mockResolvedValue({ status: 'approved' });
    rejectReviewMock.mockResolvedValue({ status: 'rejected' });
    useApproveReviewMock.mockReturnValue(approveReviewMock);
    useRejectReviewMock.mockReturnValue(rejectReviewMock);
  });

  it('filters the operations feed by selected agent', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /show activity for bootstrap/i }));

    expect(screen.getByText('Bootstrap completed Sync Config')).toBeInTheDocument();
    expect(screen.queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });

  it('approves a governance item directly from the workspace', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /approve agent.market.capability/i }));

    await waitFor(() => {
      expect(approveReviewMock).toHaveBeenCalledWith('capability', 'capability-1');
    });
  });

  it('filters the operations feed by event type', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /failed/i }));

    expect(screen.getByText('Analyzer failed Risk Scan')).toBeInTheDocument();
    expect(screen.queryByText('Bootstrap completed Sync Config')).not.toBeInTheDocument();
  });

  it('shows rejected governance items when the rejected review filter is selected', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /rejected review/i }));

    expect(screen.getByText('rejected.market.secret')).toBeInTheDocument();
    expect(screen.queryByText('agent.market.capability')).not.toBeInTheDocument();
  });

  it('rejects a governance item directly from the workspace', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /reject agent.market.capability/i }));

    await waitFor(() => {
      expect(rejectReviewMock).toHaveBeenCalledWith('capability', 'capability-1', { reason: '' });
    });
  });

  it('shows a success notice after a governance decision completes', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /approve agent.market.capability/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Approved agent.market.capability');
    });
  });

  it('shows an action error when a governance decision fails', async () => {
    const user = userEvent.setup();
    rejectReviewMock.mockRejectedValueOnce(new Error('Review backend unavailable'));

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /reject agent.market.capability/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Review backend unavailable');
    });
  });

  it('shows a relogin recovery state when a governance decision hits an expired session', async () => {
    const user = userEvent.setup();
    approveReviewMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /approve agent.market.capability/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows linked token and recent event summaries inside the identity space', () => {
    render(<SpacesPage />);

    const bootstrapIdentity = screen.getByRole('group', { name: /bootstrap agent identity/i });
    const analyzerIdentity = screen.getByRole('group', { name: /analyzer agent identity/i });

    expect(within(bootstrapIdentity).getByText('Bootstrap Primary')).toBeInTheDocument();
    expect(within(bootstrapIdentity).getByText('1 recent event')).toBeInTheDocument();
    expect(within(analyzerIdentity).getByText('Analyzer Worker')).toBeInTheDocument();
  });

  it('focuses an agent from the identity space and filters the operations feed', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /focus bootstrap agent/i }));

    expect(screen.getByText('Bootstrap completed Sync Config')).toBeInTheDocument();
    expect(screen.queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });

  it('brings focused agent and event context into the workspace header state', () => {
    mockSearchParams = new URLSearchParams('agentId=bootstrap&eventId=event-1');

    render(<SpacesPage />);

    expect(screen.getByText('Focused workspace context')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Agent')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap completed Sync Config')).toBeInTheDocument();
    expect(screen.queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });
});
