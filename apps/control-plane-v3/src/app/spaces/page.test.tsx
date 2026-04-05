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
const useSpacesMock = vi.fn();
const useCreateSpaceMock = vi.fn();
const useAddSpaceMemberMock = vi.fn();
const approveReviewMock = vi.fn();
const rejectReviewMock = vi.fn();
const createSpaceMock = vi.fn();
const addSpaceMemberMock = vi.fn();

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

vi.mock('@/domains/space', () => ({
  useSpaces: (...args: unknown[]) => useSpacesMock(...args),
  useCreateSpace: () => useCreateSpaceMock(),
  useAddSpaceMember: (spaceId: string) => useAddSpaceMemberMock(spaceId),
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

    useSpacesMock.mockReturnValue({
      spaces: [
        {
          id: 'space-1',
          name: 'Ops Triage',
          summary: 'Coordinate review and runtime follow-up',
          status: 'active',
          created_by_actor_id: 'human-admin',
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
          members: [
            {
              id: 'space-member-1',
              member_type: 'agent',
              member_id: 'bootstrap',
              role: 'participant',
              created_at: '2026-03-31T00:00:00.000Z',
            },
          ],
          timeline: [
            {
              id: 'space-entry-1',
              entry_type: 'task_completed',
              subject_type: 'task',
              subject_id: 'task-1',
              summary: 'Bootstrap completed Sync Config',
              created_at: '2026-03-31T00:00:00.000Z',
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    createSpaceMock.mockResolvedValue({ id: 'new-space', name: 'New Space' });
    useCreateSpaceMock.mockReturnValue({
      create: createSpaceMock,
      isCreating: false,
    });

    addSpaceMemberMock.mockResolvedValue({ id: 'new-member', member_id: 'agent-1' });
    useAddSpaceMemberMock.mockReturnValue({
      addMember: addSpaceMemberMock,
      isAdding: false,
    });

    approveReviewMock.mockResolvedValue({ status: 'approved' });
    rejectReviewMock.mockResolvedValue({ status: 'rejected' });
    useApproveReviewMock.mockReturnValue(approveReviewMock);
    useRejectReviewMock.mockReturnValue(rejectReviewMock);
  });

  it('filters the operations feed by selected agent', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);
    const operationsFeed = screen.getByRole('region', { name: /operations feed/i });

    await user.click(screen.getByRole('button', { name: /show activity for bootstrap/i }));

    expect(within(operationsFeed).getByText('Bootstrap completed Sync Config')).toBeInTheDocument();
    expect(within(operationsFeed).queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
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
    const operationsFeed = screen.getByRole('region', { name: /operations feed/i });

    await user.click(screen.getByRole('button', { name: /failed/i }));

    expect(within(operationsFeed).getByText('Analyzer failed Risk Scan')).toBeInTheDocument();
    expect(within(operationsFeed).queryByText('Bootstrap completed Sync Config')).not.toBeInTheDocument();
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
    const operationsFeed = screen.getByRole('region', { name: /operations feed/i });

    await user.click(screen.getByRole('button', { name: /focus bootstrap agent/i }));

    expect(within(operationsFeed).getByText('Bootstrap completed Sync Config')).toBeInTheDocument();
    expect(within(operationsFeed).queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });

  it('brings focused agent and event context into the workspace header state', () => {
    mockSearchParams = new URLSearchParams('agentId=bootstrap&eventId=event-1');

    render(<SpacesPage />);

    expect(screen.getByText('Focused workspace context')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Agent')).toBeInTheDocument();
    expect(screen.getAllByText('Bootstrap completed Sync Config').length).toBeGreaterThan(0);
    expect(screen.queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });

  it('renders persisted space records with members and timeline summaries', () => {
    render(<SpacesPage />);

    expect(screen.getByText('Persisted spaces')).toBeInTheDocument();
    expect(screen.getByText('Ops Triage')).toBeInTheDocument();
    expect(screen.getByText('Coordinate review and runtime follow-up')).toBeInTheDocument();
    // MemberManager displays member_id.slice(-8) - 'bootstrap' → 'ootstrap'
    expect(screen.getByText('ootstrap')).toBeInTheDocument();
    expect(screen.getAllByText('Bootstrap completed Sync Config').length).toBeGreaterThan(0);
  });

  it('creates a new persisted space from the workspace modal', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /创建空间/i }));
    await user.type(screen.getByPlaceholderText(/输入空间名称/i), 'Incident Response');
    await user.type(screen.getByPlaceholderText(/简要描述这个空间的用途/i), 'Coordinate responders during live incidents.');
    await user.click(screen.getAllByRole('button', { name: /创建空间/i })[1]);

    await waitFor(() => {
      expect(createSpaceMock).toHaveBeenCalledWith({
        name: 'Incident Response',
        summary: 'Coordinate responders during live incidents.',
      });
    });
  });

  it('shows a relogin recovery state when creating a workspace hits an expired session', async () => {
    const user = userEvent.setup();
    createSpaceMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /创建空间/i }));
    await user.type(screen.getByPlaceholderText(/输入空间名称/i), 'Incident Response');
    await user.click(screen.getAllByRole('button', { name: /创建空间/i })[1]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });
  });

  it('adds a member to a persisted space', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /添加成员/i }));
    await user.type(screen.getByPlaceholderText(/输入智能体ID/i), 'agent-77');
    await user.click(screen.getByRole('button', { name: /^添加$/i }));

    await waitFor(() => {
      expect(addSpaceMemberMock).toHaveBeenCalledWith({
        memberType: 'agent',
        memberId: 'agent-77',
        role: 'viewer',
      });
    });
  });

  it('shows a forbidden-specific state when adding a member loses permission', async () => {
    const user = userEvent.setup();
    addSpaceMemberMock.mockRejectedValueOnce(new ApiError(403, 'Forbidden'));

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: /添加成员/i }));
    await user.type(screen.getByPlaceholderText(/输入智能体ID/i), 'agent-77');
    await user.click(screen.getByRole('button', { name: /^添加$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('permission');
    });
  });

  it('degrades to a read-only workspace for viewer roles', () => {
    useManagementSessionGateMock.mockReturnValue({
      session: {
        email: 'viewer@example.com',
        role: 'viewer',
      },
      loading: false,
      error: null,
    });

    render(<SpacesPage />);

    expect(screen.getByText('Persisted spaces')).toBeInTheDocument();
    expect(screen.queryByText('Operations Space')).not.toBeInTheDocument();
    expect(screen.queryByText('Governance Space')).not.toBeInTheDocument();
    expect(screen.queryByText('Identity Space')).not.toBeInTheDocument();
    expect(screen.queryByText('Market Inventory')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /创建空间/i })).not.toBeInTheDocument();
    expect(screen.queryByText('成员管理')).not.toBeInTheDocument();
  });

  it('shows a forbidden-specific message when workspace data returns 403', () => {
    useEventsMock.mockReturnValue({
      events: [],
      isLoading: false,
      error: new ApiError(403, 'Forbidden'),
      mutate: vi.fn(),
    });

    render(<SpacesPage />);

    const alerts = screen.getAllByRole('alert');

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('permission');
  });
});
