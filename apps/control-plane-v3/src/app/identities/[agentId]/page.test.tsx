import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translateMessage } from '@/test-utils/i18n-mock';
import AgentDetailPage from './page';

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

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
  useParams: () => ({ agentId: 'agent-1' }),
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/management-session-recovery', () => ({
  useManagementPageSessionRecovery: () => ({
    session: { email: 'owner@example.com', role: 'owner' },
    loading: false,
    error: null,
  }),
}));

vi.mock('@/domains/event', () => ({
  useEvents: () => ({ events: [] }),
}));

vi.mock('@/domains/identity', () => ({
  useOpenClawAgent: () => ({
    data: {
      id: 'agent-1',
      name: 'Bootstrap',
      status: 'active',
      auth_method: 'openclaw_session',
      risk_tier: 'high',
      workspace_root: '/srv/bootstrap',
      agent_dir: '.openclaw/agents/bootstrap',
      model: 'gpt-5',
      thinking_level: 'balanced',
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
      allowed_capability_ids: ['cap-1'],
      allowed_task_types: ['config_sync'],
    },
    isLoading: false,
    error: null,
  }),
  useOpenClawAgents: () => ({
    data: { items: [] },
    isLoading: false,
    error: null,
  }),
  useOpenClawSessions: () => ({
    data: { items: [] },
    isLoading: false,
    error: null,
  }),
  useOpenClawDreamRuns: () => ({
    data: { items: [] },
    isLoading: false,
    error: null,
  }),
  useAgentWorkbenchSessions: () => ({
    data: {
      items: [
        {
          id: 'workbench-1',
          agent_id: 'agent-1',
          capability_id: 'cap-1',
          capability_name: 'Ops Assistant',
          title: 'Deploy triage',
          status: 'active',
          created_by_actor_id: 'owner-1',
          created_at: '2026-04-24T10:00:00.000Z',
          updated_at: '2026-04-24T10:00:00.000Z',
          last_message_at: '2026-04-24T10:00:00.000Z',
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
  useWorkbenchMessages: () => ({
    data: { items: [] },
    isLoading: false,
    error: null,
  }),
  useSendWorkbenchMessage: () => vi.fn(),
  useCreateAgentWorkbenchSession: () => vi.fn(),
  refreshAgentWorkbenchSessions: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/domains/governance', () => ({
  useCapabilities: () => ({
    data: {
      items: [
        {
          id: 'cap-1',
          name: 'Ops Assistant',
          adapter_type: 'openai',
          publication_status: 'active',
        },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

describe('agent detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('opens the workbench tab directly from the query string', () => {
    mockSearchParams = new URLSearchParams('tab=workbench');

    render(<AgentDetailPage />);

    expect(
      screen.getByRole('button', { name: translateMessage('identities.detail.tabs.workbench') })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText(translateMessage('identities.workbench.conversations'))
    ).toBeInTheDocument();
  });
});
