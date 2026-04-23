import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { translateMessage } from '@/test-utils/i18n-mock';
import SpacesPage from './page';

const t = translateMessage;

let mockSearchParams = new URLSearchParams();
const useEventsMock = vi.fn();
const useReviewsMock = vi.fn();
const useOpenClawAgentsMock = vi.fn();
const useAccessTokensMock = vi.fn();
const useSecretsMock = vi.fn();
const useCapabilitiesMock = vi.fn();
const useGlobalSessionMock = vi.fn();
const useApproveReviewMock = vi.fn();
const useRejectReviewMock = vi.fn();
const useSpacesMock = vi.fn();
const useCreateSpaceMock = vi.fn();
const useAddSpaceMemberMock = vi.fn();
const approveReviewMock = vi.fn();
const rejectReviewMock = vi.fn();
const createSpaceMock = vi.fn();
const addSpaceMemberMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
  }),
}));

vi.mock('@/components/route-guard', () => ({
  ManagementRouteGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session-state', () => ({
  useGlobalSession: () => useGlobalSessionMock(),
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
  useOpenClawAgents: () => useOpenClawAgentsMock(),
  useAccessTokens: () => useAccessTokensMock(),
}));

vi.mock('@/domains/governance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domains/governance')>();
  return {
    ...actual,
    useSecrets: () => useSecretsMock(),
    useCapabilities: () => useCapabilitiesMock(),
  };
});

vi.mock('@/domains/space', () => ({
  useSpaces: (...args: unknown[]) => useSpacesMock(...args),
  useCreateSpace: () => useCreateSpaceMock(),
  useAddSpaceMember: (spaceId: string) => useAddSpaceMemberMock(spaceId),
}));

describe('spaces page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    useGlobalSessionMock.mockReturnValue({
      state: 'authenticated',
      email: 'owner@example.com',
      role: 'owner',
      sessionId: 'session-1',
      lastLoadedAt: Date.now(),
      summary: { email: 'owner@example.com', role: 'owner', session_id: 'session-1' },
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
          summary: 'Bootstrap Credential completed Sync Config',
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

    useOpenClawAgentsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'bootstrap',
            name: 'Bootstrap Credential',
            risk_tier: 'high',
            auth_method: 'openclaw_session',
            status: 'active',
            workspace_root: '/srv/openclaw/bootstrap',
            agent_dir: '.openclaw/agents/bootstrap',
            model: 'gpt-5',
            thinking_level: 'high',
            sandbox_mode: 'workspace-write',
            dream_policy: {
              enabled: true,
              max_steps_per_run: 4,
              max_followup_tasks: 1,
              allow_task_proposal: true,
              allow_memory_write: true,
              max_context_tokens: 4096,
            },
            tools_policy: {},
            skills_policy: {},
            allowed_task_types: [],
            allowed_capability_ids: [],
          },
          {
            id: 'analyzer',
            name: 'Analyzer Agent',
            risk_tier: 'medium',
            auth_method: 'openclaw_session',
            status: 'active',
            workspace_root: '/srv/openclaw/analyzer',
            agent_dir: '.openclaw/agents/analyzer',
            model: 'gpt-5-mini',
            thinking_level: 'balanced',
            sandbox_mode: 'read-only',
            dream_policy: {
              enabled: false,
              max_steps_per_run: 3,
              max_followup_tasks: 0,
              allow_task_proposal: false,
              allow_memory_write: false,
              max_context_tokens: 2048,
            },
            tools_policy: {},
            skills_policy: {},
            allowed_task_types: [],
            allowed_capability_ids: [],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useAccessTokensMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'token-bootstrap',
            displayName: 'Bootstrap Primary',
            tokenPrefix: 'cp_tok_123',
            subjectType: 'openclaw_agent',
            subjectId: 'bootstrap',
            status: 'active',
            trustScore: 0.92,
            scopes: [],
            labels: {},
            policy: {},
          },
          {
            id: 'token-analyzer',
            displayName: 'Analyzer Worker',
            tokenPrefix: 'cp_tok_456',
            subjectType: 'openclaw_agent',
            subjectId: 'analyzer',
            status: 'active',
            trustScore: 0.81,
            scopes: [],
            labels: {},
            policy: {},
          },
        ],
      },
      isLoading: false,
      error: null,
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
              summary: 'Bootstrap Credential completed Sync Config',
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
    const operationsFeed = screen.getByRole('region', { name: t('common.operationsFeed') });

    await user.click(
      screen.getByRole('button', {
        name: t('spaces.sections.showActivityFor', { id: 'bootstrap' }),
      })
    );

    expect(
      within(operationsFeed).getByText('Bootstrap Credential completed Sync Config')
    ).toBeInTheDocument();
    expect(within(operationsFeed).queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });

  it('approves a governance item directly from the workspace', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(
      screen.getByRole('button', {
        name: t('spaces.governance.approve', { title: 'agent.market.capability' }),
      })
    );

    await waitFor(() => {
      expect(approveReviewMock).toHaveBeenCalledWith('capability', 'capability-1');
    });
  });

  it('filters the operations feed by event type', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);
    const operationsFeed = screen.getByRole('region', { name: t('common.operationsFeed') });

    await user.click(screen.getByRole('button', { name: t('spaces.sections.failed') }));

    expect(within(operationsFeed).getByText('Analyzer failed Risk Scan')).toBeInTheDocument();
    expect(
      within(operationsFeed).queryByText('Bootstrap Credential completed Sync Config')
    ).not.toBeInTheDocument();
  });

  it('shows rejected governance items when the rejected review filter is selected', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: t('spaces.governance.rejectedReview') }));

    expect(screen.getByText('rejected.market.secret')).toBeInTheDocument();
    expect(screen.getByText(t('governance.status.rejected'))).toBeInTheDocument();
    expect(screen.queryByText(/^rejected$/i)).not.toBeInTheDocument();
    expect(screen.queryByText('agent.market.capability')).not.toBeInTheDocument();
  });

  it('rejects a governance item directly from the workspace', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(
      screen.getByRole('button', {
        name: t('spaces.governance.reject', { title: 'agent.market.capability' }),
      })
    );

    await waitFor(() => {
      expect(rejectReviewMock).toHaveBeenCalledWith('capability', 'capability-1', { reason: '' });
    });
  });

  it('shows a success notice after a governance decision completes', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(
      screen.getByRole('button', {
        name: t('spaces.governance.approve', { title: 'agent.market.capability' }),
      })
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        t('spaces.notices.approvedReview', { title: 'agent.market.capability' })
      );
    });
  });

  it('shows an action error when a governance decision fails', async () => {
    const user = userEvent.setup();
    rejectReviewMock.mockRejectedValueOnce(new Error('Review backend unavailable'));

    render(<SpacesPage />);

    await user.click(
      screen.getByRole('button', {
        name: t('spaces.governance.reject', { title: 'agent.market.capability' }),
      })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Review backend unavailable');
    });
  });

  it('shows a relogin recovery state when a governance decision hits an expired session', async () => {
    const user = userEvent.setup();
    approveReviewMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<SpacesPage />);

    await user.click(
      screen.getByRole('button', {
        name: t('spaces.governance.approve', { title: 'agent.market.capability' }),
      })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('spaces.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: t('auth.logout.continueToLogin') })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows linked token and recent event summaries inside the identity space', () => {
    render(<SpacesPage />);

    const bootstrapIdentity = screen.getByRole('group', {
      name: t('spaces.sections.identityAriaLabel', { name: 'Bootstrap Credential' }),
    });
    const analyzerIdentity = screen.getByRole('group', {
      name: t('spaces.sections.identityAriaLabel', { name: 'Analyzer Agent' }),
    });

    expect(within(bootstrapIdentity).getByText('Bootstrap Primary')).toBeInTheDocument();
    expect(
      within(bootstrapIdentity).getByText(t('spaces.sections.recentEvents', { count: 1 }))
    ).toBeInTheDocument();
    expect(within(analyzerIdentity).getByText('Analyzer Worker')).toBeInTheDocument();
  });

  it('focuses an agent from the identity space and filters the operations feed', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);
    const operationsFeed = screen.getByRole('region', { name: t('common.operationsFeed') });

    await user.click(
      screen.getByRole('button', {
        name: t('spaces.sections.focusIdentity', { name: 'Bootstrap Credential' }),
      })
    );

    expect(
      within(operationsFeed).getByText('Bootstrap Credential completed Sync Config')
    ).toBeInTheDocument();
    expect(within(operationsFeed).queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });

  it('brings focused agent and event context into the workspace header state', () => {
    mockSearchParams = new URLSearchParams('agentId=bootstrap&eventId=event-1');

    render(<SpacesPage />);

    expect(screen.getByText(t('spaces.focusedContext.title'))).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Credential')).toBeInTheDocument();
    expect(
      screen.getAllByText('Bootstrap Credential completed Sync Config').length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Analyzer failed Risk Scan')).not.toBeInTheDocument();
  });

  it('renders persisted space records with members and timeline summaries', () => {
    render(<SpacesPage />);

    expect(screen.getByText(t('spaces.sections.persistedSpacesTitle'))).toBeInTheDocument();
    expect(screen.getByText('Ops Triage')).toBeInTheDocument();
    expect(screen.getByText('Coordinate review and runtime follow-up')).toBeInTheDocument();
    expect(screen.getAllByText(t('common.active')).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/^active$/)).not.toBeInTheDocument();
    // MemberManager displays member_id.slice(-8) - 'bootstrap' → 'ootstrap'
    expect(screen.getByText('ootstrap')).toBeInTheDocument();
    expect(screen.getByText(t('spaces.memberManager.roles.participant'))).toBeInTheDocument();
    expect(screen.queryByText(/^participant$/)).not.toBeInTheDocument();
    expect(
      screen.getAllByText('Bootstrap Credential completed Sync Config').length
    ).toBeGreaterThan(0);
  });

  it('creates a new persisted space from the workspace modal', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: t('spaces.createSpace') }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: t('common.closeModal') }).length).toBeGreaterThan(
      0
    );
    await user.type(
      screen.getByPlaceholderText(t('spaces.createModal.namePlaceholder')),
      'Incident Response'
    );
    await user.type(
      screen.getByPlaceholderText(t('spaces.createModal.summaryPlaceholder')),
      'Coordinate responders during live incidents.'
    );
    await user.click(screen.getAllByRole('button', { name: t('spaces.createSpace') })[1]);

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

    await user.click(screen.getByRole('button', { name: t('spaces.createSpace') }));
    await user.type(
      screen.getByPlaceholderText(t('spaces.createModal.namePlaceholder')),
      'Incident Response'
    );
    await user.click(screen.getAllByRole('button', { name: t('spaces.createSpace') })[1]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('spaces.sessionExpired'));
    });
  });

  it('adds a member to a persisted space', async () => {
    const user = userEvent.setup();

    render(<SpacesPage />);

    await user.click(screen.getByRole('button', { name: t('spaces.memberManager.addMember') }));
    await user.type(
      screen.getByPlaceholderText(t('spaces.memberManager.memberIdPlaceholderAgent')),
      'agent-77'
    );
    await user.click(screen.getByRole('button', { name: t('spaces.memberManager.submit') }));

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

    await user.click(screen.getByRole('button', { name: t('spaces.memberManager.addMember') }));
    await user.type(
      screen.getByPlaceholderText(t('spaces.memberManager.memberIdPlaceholderAgent')),
      'agent-77'
    );
    await user.click(screen.getByRole('button', { name: t('spaces.memberManager.submit') }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('spaces.sessionForbidden'));
    });
  });

  it('degrades to a read-only workspace for viewer roles', () => {
    useGlobalSessionMock.mockReturnValue({
      state: 'authenticated',
      email: 'viewer@example.com',
      role: 'viewer',
      sessionId: 'session-2',
      lastLoadedAt: Date.now(),
      summary: { email: 'viewer@example.com', role: 'viewer', session_id: 'session-2' },
    });

    render(<SpacesPage />);

    expect(screen.getByText(t('spaces.sections.persistedSpacesTitle'))).toBeInTheDocument();
    expect(screen.queryByText('Operations Space')).not.toBeInTheDocument();
    expect(screen.queryByText('Governance Space')).not.toBeInTheDocument();
    expect(screen.queryByText('Identity Space')).not.toBeInTheDocument();
    expect(screen.queryByText('Market Inventory')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('spaces.createSpace') })).not.toBeInTheDocument();
    expect(screen.queryByText(t('spaces.memberManager.manageTitle'))).not.toBeInTheDocument();
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
    expect(alerts[0]).toHaveTextContent(t('spaces.sessionForbidden'));
  });
});
