import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translateMessage } from '@/test-utils/i18n-mock';
import { SessionManager } from './session-manager';

const createOpenClawSessionMock = vi.fn();
const revokeOpenClawSessionMock = vi.fn();
const useAgentWorkbenchSessionsMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
  }),
}));

vi.mock('@/domains/identity', () => ({
  useCreateOpenClawSession: () => createOpenClawSessionMock,
  useRevokeOpenClawSession: () => revokeOpenClawSessionMock,
  useAgentWorkbenchSessions: () => useAgentWorkbenchSessionsMock(),
  refreshOpenClawSessions: vi.fn(() => Promise.resolve()),
  refreshAgentWorkbenchSessions: vi.fn(() => Promise.resolve()),
}));

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createOpenClawSessionMock.mockResolvedValue({ id: 'runtime-2' });
    revokeOpenClawSessionMock.mockResolvedValue({ id: 'runtime-1', status: 'revoked' });
    useAgentWorkbenchSessionsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'workbench-1',
            agent_id: 'agent-1',
            title: 'Workbench session that should stay out',
            capability_id: 'cap-1',
            capability_name: 'Ops Assistant',
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
    });
  });

  it('manages runtime sessions only and excludes workbench conversations', () => {
    render(
      <SessionManager
        agent={{
          id: 'agent-1',
          name: 'Bootstrap',
        } as never}
        sessions={[
          {
            id: 'runtime-1',
            agent_id: 'agent-1',
            session_key: 'sess_runtime_1',
            display_name: 'Primary Runtime Session',
            channel: 'chat',
            subject: 'deploy',
            transcript_metadata: {},
            input_tokens: 0,
            output_tokens: 0,
            context_tokens: 0,
            updated_at: '2026-04-24T10:00:00.000Z',
          },
        ]}
        sessionErrorMessage={null}
        canManage
      />
    );

    expect(screen.getByText('Primary Runtime Session')).toBeInTheDocument();
    expect(screen.queryByText('Workbench session that should stay out')).not.toBeInTheDocument();
  });

  it('creates runtime sessions with a session key payload', async () => {
    const user = userEvent.setup();

    render(
      <SessionManager
        agent={{
          id: 'agent-1',
          name: 'Bootstrap',
        } as never}
        sessions={[]}
        sessionErrorMessage={null}
        canManage
      />
    );

    await user.click(screen.getByRole('button', { name: translateMessage('identities.sessionManager.newSession') }));
    await user.type(screen.getByLabelText(translateMessage('identities.sessionManager.sessionKey')), 'sess_runtime_2');
    await user.type(
      screen.getByLabelText(translateMessage('identities.sessionManager.displayName')),
      'Support Session'
    );
    await user.clear(screen.getByLabelText(translateMessage('identities.sessionManager.channel')));
    await user.type(screen.getByLabelText(translateMessage('identities.sessionManager.channel')), 'chat');
    await user.type(screen.getByLabelText(translateMessage('identities.sessionManager.subject')), 'deployment');
    await user.click(screen.getByRole('button', { name: translateMessage('common.create') }));

    expect(createOpenClawSessionMock).toHaveBeenCalledWith('agent-1', {
      session_key: 'sess_runtime_2',
      display_name: 'Support Session',
      channel: 'chat',
      subject: 'deployment',
    });
  });
});
