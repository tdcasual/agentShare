import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/management-session-recovery', () => ({
  useManagementPageSessionRecovery: (...args: unknown[]) =>
    useManagementPageSessionRecoveryMock(...args),
  ManagementSessionExpiredAlert: ({ message }: { message: string }) => (
    <div role="alert">{message}</div>
  ),
  ManagementForbiddenAlert: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  ManagementSessionRecoveryNotice: ({ message }: { message: string }) => <div>{message}</div>,
  isForbiddenError: () => false,
  isUnauthorizedError: () => false,
}));

vi.mock('@/domains/identity', () => ({
  useAdminAccounts: () => useAdminAccountsMock(),
  useOpenClawAgents: () => useOpenClawAgentsMock(),
  useOpenClawSessions: () => useOpenClawSessionsMock(),
  useOpenClawDreamRuns: () => useOpenClawDreamRunsMock(),
  useOpenClawFiles: (agentId: string | null) => useOpenClawFilesMock(agentId),
  useDeleteOpenClawAgent: () => useDeleteOpenClawAgentMock(),
  usePauseOpenClawDreamRun: () => usePauseOpenClawDreamRunMock(),
  useResumeOpenClawDreamRun: () => useResumeOpenClawDreamRunMock(),
  refreshSession: () => Promise.resolve(),
  refreshAdminAccounts: () => Promise.resolve(),
  refreshOpenClawAgents: () => Promise.resolve(),
  refreshOpenClawSessions: () => Promise.resolve(),
  refreshOpenClawDreamRuns: () => Promise.resolve(),
}));

vi.mock('@/domains/event', () => ({
  useEvents: () => useEventsMock(),
  refreshEvents: () => Promise.resolve(),
}));

describe('openclaw migration characterization on identities page', () => {
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
            tools_policy: { mode: 'allowlist' },
            skills_policy: { mode: 'allowlist' },
            allowed_capability_ids: ['cap-deploy'],
            allowed_task_types: ['config_sync'],
          },
          {
            id: 'analyzer',
            name: 'Analyzer Agent',
            status: 'active',
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
            tools_policy: {},
            skills_policy: {},
            allowed_capability_ids: [],
            allowed_task_types: ['account_read'],
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

    useOpenClawFilesMock.mockReturnValue({
      data: { items: [] },
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

    useDeleteOpenClawAgentMock.mockReturnValue(vi.fn());
    usePauseOpenClawDreamRunMock.mockReturnValue(vi.fn());
    useResumeOpenClawDreamRunMock.mockReturnValue(vi.fn());
  });

  it('keeps operator visibility while reframing agent coverage around openclaw sessions and workspaces', async () => {
    const user = userEvent.setup();
    render(<IdentitiesPage />);

    await user.click(
      screen.getByRole('button', { name: /view details for bootstrap credential/i })
    );

    expect(screen.getByText('Identity Management')).toBeInTheDocument();
    expect(screen.getByText('Founding Owner')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Credential')).toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();
    expect(screen.getByText(/OpenClaw coverage/i)).toBeInTheDocument();
    expect(screen.getByText('identities.metrics.agentsWithSessions')).toBeInTheDocument();
    expect(screen.getByText('identities.metrics.workspaceReadyAgents')).toBeInTheDocument();
    expect(screen.getByText(/Dream Mode/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /manage tokens/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create agent/i })).not.toBeInTheDocument();
  });
});
