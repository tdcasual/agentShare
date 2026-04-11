import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import IdentitiesPage from './page';

let mockSearchParams = new URLSearchParams();
const useManagementPageSessionRecoveryMock = vi.fn();
const useAdminAccountsMock = vi.fn();
const useOpenClawAgentsMock = vi.fn();
const useOpenClawSessionsMock = vi.fn();
const useOpenClawDreamRunsMock = vi.fn();
const useOpenClawFilesMock = vi.fn();
const useEventsMock = vi.fn();
const useDeleteOpenClawAgentMock = vi.fn();
const usePauseOpenClawDreamRunMock = vi.fn();
const useResumeOpenClawDreamRunMock = vi.fn();
const deleteOpenClawAgentMock = vi.fn();
const pauseOpenClawDreamRunMock = vi.fn();
const resumeOpenClawDreamRunMock = vi.fn();
const refreshSessionMock = vi.fn();
const refreshAdminAccountsMock = vi.fn();
const refreshOpenClawAgentsMock = vi.fn();
const refreshOpenClawSessionsMock = vi.fn();
const refreshOpenClawDreamRunsMock = vi.fn();
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

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/management-session-recovery', async () => {
  const actual = await vi.importActual<typeof import('@/lib/management-session-recovery')>(
    '@/lib/management-session-recovery'
  );

  return {
    ...actual,
    useManagementPageSessionRecovery: (...args: unknown[]) =>
      useManagementPageSessionRecoveryMock(...args),
    ManagementSessionExpiredAlert: ({ message }: { message: string }) => (
      <div role="alert">{message}</div>
    ),
    ManagementForbiddenAlert: ({ message }: { message: string }) => (
      <div role="alert">{message}</div>
    ),
  };
});

vi.mock('@/domains/identity', () => ({
  useAdminAccounts: () => useAdminAccountsMock(),
  useOpenClawAgents: () => useOpenClawAgentsMock(),
  useOpenClawSessions: () => useOpenClawSessionsMock(),
  useOpenClawDreamRuns: () => useOpenClawDreamRunsMock(),
  useOpenClawFiles: (agentId: string | null) => useOpenClawFilesMock(agentId),
  useDeleteOpenClawAgent: () => useDeleteOpenClawAgentMock(),
  usePauseOpenClawDreamRun: () => usePauseOpenClawDreamRunMock(),
  useResumeOpenClawDreamRun: () => useResumeOpenClawDreamRunMock(),
  refreshSession: () => refreshSessionMock(),
  refreshAdminAccounts: () => refreshAdminAccountsMock(),
  refreshOpenClawAgents: () => refreshOpenClawAgentsMock(),
  refreshOpenClawSessions: () => refreshOpenClawSessionsMock(),
  refreshOpenClawDreamRuns: () => refreshOpenClawDreamRunsMock(),
}));

vi.mock('@/domains/event', () => ({
  useEvents: () => useEventsMock(),
  refreshEvents: () => refreshEventsMock(),
}));

describe('identities page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    useManagementPageSessionRecoveryMock.mockReturnValue({
      session: {
        email: 'owner@example.com',
        role: 'owner',
      },
      loading: false,
      error: null,
      shouldShowForbidden: false,
      shouldShowSessionExpired: false,
      clearAllAuthErrors: vi.fn(),
      consumeUnauthorized: vi.fn().mockReturnValue(false),
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

    useOpenClawAgentsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'bootstrap',
            name: 'Bootstrap Credential',
            status: 'active',
            auth_method: 'openclaw_session',
            risk_tier: 'high',
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
            tools_policy: { mode: 'allowlist', tools: ['shell', 'git'] },
            skills_policy: { mode: 'allowlist', skills: ['deploy', 'docs'] },
            allowed_task_types: ['config_sync', 'prompt_run'],
            allowed_capability_ids: ['cap-deploy'],
          },
          {
            id: 'analyzer',
            name: 'Analyzer Agent',
            status: 'inactive',
            auth_method: 'openclaw_session',
            risk_tier: 'medium',
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
            tools_policy: { mode: 'monitor', tools: ['search'] },
            skills_policy: {},
            allowed_task_types: ['account_read'],
            allowed_capability_ids: [],
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useOpenClawSessionsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'session-bootstrap',
            agent_id: 'bootstrap',
            session_key: 'sess_bootstrap_primary',
            display_name: 'Primary Bootstrap Session',
            channel: 'chat',
            subject: 'deployment triage',
            transcript_metadata: {},
            input_tokens: 1200,
            output_tokens: 340,
            context_tokens: 4096,
            updated_at: '2026-03-31T12:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useOpenClawDreamRunsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'dream-run-1',
            agent_id: 'bootstrap',
            session_id: 'session-bootstrap',
            task_id: null,
            objective: 'Inspect deployment drift',
            status: 'stopped',
            stop_reason: 'budget_exhausted',
            step_budget: 4,
            consumed_steps: 4,
            created_followup_tasks: 1,
            started_by_actor_type: 'agent',
            started_by_actor_id: 'bootstrap',
            runtime_metadata: { channel: 'chat' },
            updated_at: '2026-03-31T13:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useOpenClawFilesMock.mockImplementation((agentId: string | null) => ({
      data: {
        items:
          agentId === 'bootstrap'
            ? [
                {
                  agent_id: 'bootstrap',
                  file_name: 'AGENTS.md',
                  content: '# Bootstrap Credential\n\nOpenClaw workspace instructions.',
                },
                {
                  agent_id: 'bootstrap',
                  file_name: 'workspace.json',
                  content: '{"workspace":"bootstrap"}',
                },
              ]
            : [],
      },
      isLoading: false,
      error: null,
    }));

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
          details: 'Published follow-up feedback',
          created_at: '2026-03-31T12:30:00.000Z',
          updated_at: '2026-03-31T12:30:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    deleteOpenClawAgentMock.mockResolvedValue({ status: 'deleted', id: 'bootstrap' });
    useDeleteOpenClawAgentMock.mockReturnValue(deleteOpenClawAgentMock);
    pauseOpenClawDreamRunMock.mockResolvedValue({
      id: 'dream-run-1',
      status: 'paused',
      stop_reason: 'operator_paused',
    });
    resumeOpenClawDreamRunMock.mockResolvedValue({
      id: 'dream-run-1',
      status: 'active',
      stop_reason: null,
    });
    usePauseOpenClawDreamRunMock.mockReturnValue(pauseOpenClawDreamRunMock);
    useResumeOpenClawDreamRunMock.mockReturnValue(resumeOpenClawDreamRunMock);
  });

  it('filters human and openclaw agent lists locally from the search query', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    expect(screen.getByText('Alice Operator')).toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /common.searchIdentities/i }), 'read-only');

    expect(screen.queryByText('Alice Operator')).not.toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();
    expect(screen.queryByText('Bootstrap Credential')).not.toBeInTheDocument();
    expect(screen.getByText(/No human operators match/i)).toBeInTheDocument();
  });

  it('refreshes the management snapshot when refresh is requested', async () => {
    const user = userEvent.setup();
    refreshSessionMock.mockResolvedValue(undefined);
    refreshAdminAccountsMock.mockResolvedValue(undefined);
    refreshOpenClawAgentsMock.mockResolvedValue(undefined);
    refreshOpenClawSessionsMock.mockResolvedValue(undefined);
    refreshOpenClawDreamRunsMock.mockResolvedValue(undefined);
    refreshEventsMock.mockResolvedValue(undefined);

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /refresh snapshot/i }));

    await waitFor(() => {
      expect(refreshSessionMock).toHaveBeenCalledTimes(1);
      expect(refreshAdminAccountsMock).toHaveBeenCalledTimes(1);
      expect(refreshOpenClawAgentsMock).toHaveBeenCalledTimes(1);
      expect(refreshOpenClawSessionsMock).toHaveBeenCalledTimes(1);
      expect(refreshOpenClawDreamRunsMock).toHaveBeenCalledTimes(1);
      expect(refreshEventsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows dream mode policy and recent dream runs for openclaw agents', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(
      screen.getByRole('button', { name: /view details for bootstrap credential/i })
    );

    expect(screen.getByText('Dream Mode')).toBeInTheDocument();
    expect(screen.getByText('identities.values.enabled')).toBeInTheDocument();
    expect(screen.getAllByText('Inspect deployment drift').length).toBeGreaterThan(0);
    expect(screen.getByText(/budget exhausted/i)).toBeInTheDocument();
  });

  it('opens a focused dream run detail panel and can pause or resume it', async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams('agentId=bootstrap&dreamRunId=dream-run-1');
    useOpenClawDreamRunsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'dream-run-1',
            agent_id: 'bootstrap',
            session_id: 'session-bootstrap',
            task_id: null,
            objective: 'Inspect deployment drift',
            status: 'active',
            stop_reason: null,
            step_budget: 4,
            consumed_steps: 2,
            created_followup_tasks: 1,
            started_by_actor_type: 'agent',
            started_by_actor_id: 'bootstrap',
            runtime_metadata: { channel: 'chat' },
            updated_at: '2026-03-31T13:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const { rerender } = render(<IdentitiesPage />);

    expect(screen.getByText('Dream run detail')).toBeInTheDocument();
    expect(screen.getAllByText('Inspect deployment drift').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /pause dream run/i }));
    expect(pauseOpenClawDreamRunMock).toHaveBeenCalledWith('dream-run-1', 'operator_paused');

    useOpenClawDreamRunsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'dream-run-1',
            agent_id: 'bootstrap',
            session_id: 'session-bootstrap',
            task_id: null,
            objective: 'Inspect deployment drift',
            status: 'paused',
            stop_reason: 'operator_paused',
            step_budget: 4,
            consumed_steps: 2,
            created_followup_tasks: 1,
            started_by_actor_type: 'agent',
            started_by_actor_id: 'bootstrap',
            runtime_metadata: { channel: 'chat' },
            updated_at: '2026-03-31T13:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    rerender(<IdentitiesPage key="after-pause" />);

    await user.click(screen.getByRole('button', { name: /resume dream run/i }));
    expect(resumeOpenClawDreamRunMock).toHaveBeenCalledWith('dream-run-1');
  });

  it('keeps agent cards visible when session data is temporarily unavailable', () => {
    useOpenClawSessionsMock.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: new Error('Sessions backend unavailable'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByText('Bootstrap Credential')).toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();
    expect(screen.getByText(/Session history is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Sessions backend unavailable/i)).toBeInTheDocument();
  });

  it('reveals openclaw runtime details, files, sessions, and recent events when expanded', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(
      screen.getByRole('button', { name: /view details for bootstrap credential/i })
    );

    expect(screen.getByText('identities.labels.workspaceRoot')).toBeInTheDocument();
    expect(screen.getAllByText('/srv/openclaw/bootstrap').length).toBeGreaterThan(0);
    expect(screen.getByText('identities.labels.agentDirectory')).toBeInTheDocument();
    expect(screen.getAllByText('.openclaw/agents/bootstrap').length).toBeGreaterThan(0);
    expect(screen.getByText('identities.labels.toolPolicy')).toBeInTheDocument();
    expect(screen.getByText(/allowlist/i)).toBeInTheDocument();
    expect(screen.getByText('identities.labels.allowedTaskTypes')).toBeInTheDocument();
    expect(screen.getByText('config_sync, prompt_run')).toBeInTheDocument();
    expect(screen.getByText('identities.labels.allowedCapabilityIds')).toBeInTheDocument();
    expect(screen.getByText('cap-deploy')).toBeInTheDocument();
    expect(screen.getByText('Primary Bootstrap Session')).toBeInTheDocument();
    expect(screen.getByText('AGENTS.md')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Credential completed Sync Config')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /manage tokens/i })).not.toBeInTheDocument();
  });

  it('lets owners delete an openclaw agent from the management view', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(
      screen.getByRole('button', { name: /view details for bootstrap credential/i })
    );
    await user.click(screen.getByRole('button', { name: /delete bootstrap credential/i }));

    expect(deleteOpenClawAgentMock).toHaveBeenCalledWith('bootstrap');
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    const consumeUnauthorizedMock = vi.fn().mockImplementation((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        useManagementPageSessionRecoveryMock.mockReturnValue({
          session: null,
          loading: false,
          error: 'identities.sessionExpired',
          shouldShowForbidden: false,
          shouldShowSessionExpired: true,
          clearAllAuthErrors: vi.fn(),
          consumeUnauthorized: consumeUnauthorizedMock,
        });
        return true;
      }
      return false;
    });

    useManagementPageSessionRecoveryMock.mockReturnValue({
      session: {
        email: 'owner@example.com',
        role: 'owner',
      },
      loading: false,
      error: null,
      shouldShowForbidden: false,
      shouldShowSessionExpired: false,
      clearAllAuthErrors: vi.fn(),
      consumeUnauthorized: consumeUnauthorizedMock,
    });
    refreshSessionMock.mockRejectedValue(new ApiError(401, 'Missing management session'));

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /refresh snapshot/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert')[0]).toHaveTextContent('identities.sessionExpired');
    });
  });

  it('highlights and expands the focused openclaw agent from the query string', () => {
    mockSearchParams = new URLSearchParams('agentId=bootstrap');

    render(<IdentitiesPage />);

    expect(screen.getByText('identities.focusedIdentity')).toBeInTheDocument();
    expect(screen.getByText(/identities.agentType.openclaw · bootstrap/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /hide details for bootstrap credential/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('agent-card-bootstrap')).toHaveAttribute(
      'data-focus-state',
      'focused'
    );
  });
});
