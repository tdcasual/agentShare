import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translateMessage } from '@/test-utils/i18n-mock';
import { WorkbenchPanel } from './workbench-panel';

const useWorkbenchMessagesMock = vi.fn();
const useSendWorkbenchMessageMock = vi.fn();
const useCreateAgentWorkbenchSessionMock = vi.fn();
const useCapabilitiesMock = vi.fn();
const createAgentWorkbenchSessionMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
  }),
}));

vi.mock('@/domains/identity', () => ({
  useWorkbenchMessages: (...args: unknown[]) => useWorkbenchMessagesMock(...args),
  useSendWorkbenchMessage: () => useSendWorkbenchMessageMock(),
  useCreateAgentWorkbenchSession: () => useCreateAgentWorkbenchSessionMock(),
  refreshAgentWorkbenchSessions: vi.fn(() => Promise.resolve()),
  refreshWorkbenchMessages: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/domains/governance', () => ({
  useCapabilities: () => useCapabilitiesMock(),
}));

describe('WorkbenchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkbenchMessagesMock.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      error: null,
    });
    useSendWorkbenchMessageMock.mockReturnValue(vi.fn());
    createAgentWorkbenchSessionMock.mockResolvedValue({
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
    });
    useCreateAgentWorkbenchSessionMock.mockReturnValue(createAgentWorkbenchSessionMock);
    useCapabilitiesMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'cap-1',
            name: 'Ops Assistant',
            adapter_type: 'openai',
            publication_status: 'active',
          },
          {
            id: 'cap-2',
            name: 'Inactive Assistant',
            adapter_type: 'openai',
            publication_status: 'pending_review',
          },
          {
            id: 'cap-3',
            name: 'Non OpenAI Assistant',
            adapter_type: 'anthropic',
            publication_status: 'active',
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it('creates a workbench session with capability_id and title', async () => {
    const user = userEvent.setup();

    render(
      <WorkbenchPanel
        agent={{
          id: 'agent-1',
          name: 'Bootstrap',
          allowed_capability_ids: ['cap-1'],
        } as never}
        workbenchSessions={[]}
        isLoadingSessions={false}
        sessionsError={null}
      />
    );

    await user.click(screen.getByRole('button', { name: translateMessage('identities.sessionManager.newSession') }));
    await user.selectOptions(
      screen.getByLabelText(translateMessage('identities.workbench.capability')),
      'cap-1'
    );
    await user.type(
      screen.getByLabelText(translateMessage('identities.sessionManager.displayName')),
      'Deploy triage'
    );
    await user.click(screen.getByRole('button', { name: translateMessage('common.create') }));

    expect(createAgentWorkbenchSessionMock).toHaveBeenCalledWith('agent-1', {
      capability_id: 'cap-1',
      title: 'Deploy triage',
    });
  });

  it('shows an empty capability state when the agent has no active openai capabilities', async () => {
    useCapabilitiesMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'cap-2',
            name: 'Inactive Assistant',
            adapter_type: 'openai',
            publication_status: 'pending_review',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();

    render(
      <WorkbenchPanel
        agent={{
          id: 'agent-1',
          name: 'Bootstrap',
          allowed_capability_ids: ['cap-1'],
        } as never}
        workbenchSessions={[]}
        isLoadingSessions={false}
        sessionsError={null}
      />
    );

    await user.click(screen.getByRole('button', { name: translateMessage('identities.sessionManager.newSession') }));

    expect(screen.getByText(translateMessage('identities.workbench.noCapabilities'))).toBeInTheDocument();
  });
});
