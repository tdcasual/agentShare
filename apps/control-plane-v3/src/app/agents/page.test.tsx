import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  approveJoinRequest,
  createAgent,
  createAgentInvite,
  rejectJoinRequest,
} from '@/domains/agent';
import type { AgentJoinRequest } from '@/lib/vaultgate-api';
import AgentsPage from './page';

const agentMocks = vi.hoisted(() => ({
  refreshAgents: vi.fn(),
  useAgentJoinRequests: vi.fn(() => ({
    requests: [] as AgentJoinRequest[],
    refresh: vi.fn(),
  })),
}));

vi.mock('@/domains/agent', () => ({
  useAgents: () => ({
    agents: [{ id: 'agent-1', name: 'Deploy Agent', description: 'Production', status: 'active' }],
    isLoading: false,
    error: null,
    refresh: agentMocks.refreshAgents,
  }),
  createAgent: vi.fn(),
  createAgentInvite: vi.fn(),
  useAgentJoinRequests: agentMocks.useAgentJoinRequests,
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
}));

vi.mock('@/domains/space', () => ({
  useSpaces: () => ({ spaces: [] }),
}));

describe('AgentsPage', () => {
  it('renders agents and the create action', () => {
    render(<AgentsPage />);
    expect(screen.getByText('Deploy Agent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agents\.new/i })).toBeInTheDocument();
  });

  it('generates an executable onboarding prompt without exposing a long-lived token', async () => {
    vi.mocked(createAgentInvite).mockResolvedValueOnce({
      id: 'invite-1',
      label: 'Deploy',
      code: 'vgi_invite-code',
      default_space_id: null,
      default_role: 'reader',
      status: 'active',
      expires_at: '2026-08-21T00:00:00Z',
      created_at: '2026-08-20T00:00:00Z',
    });
    const user = userEvent.setup();
    render(<AgentsPage />);

    await user.click(screen.getByRole('button', { name: /agents\.invite/i }));
    await user.type(screen.getByLabelText('agents.inviteLabel'), 'Deploy');
    await user.click(screen.getByRole('button', { name: /agents\.generateInvite/i }));

    const prompt = await screen.findByRole('textbox', { name: 'agents.invitePrompt' });
    const promptText = (prompt as HTMLTextAreaElement).value;
    expect(promptText).toContain('vgi_invite-code');
    expect(promptText).toContain('/<request_id>/credential');
    expect(promptText).toContain('Idempotency-Key');
    expect(promptText).not.toContain('vg_live');
  });

  it('creates an agent and refreshes the list', async () => {
    const user = userEvent.setup();
    render(<AgentsPage />);

    await user.click(screen.getByRole('button', { name: /agents\.new/i }));
    await user.type(screen.getByLabelText('agents.name'), 'Backup Agent');
    await user.type(screen.getByLabelText('agents.agentDescription'), 'Nightly backups');
    await user.click(screen.getByRole('button', { name: 'common.create' }));

    expect(createAgent).toHaveBeenCalledWith({
      name: 'Backup Agent',
      description: 'Nightly backups',
    });
    expect(agentMocks.refreshAgents).toHaveBeenCalled();
  });

  it('approves and rejects pending join requests', async () => {
    const refreshRequests = vi.fn();
    agentMocks.useAgentJoinRequests.mockReturnValue({
      requests: [
        {
          id: 'request-1',
          invite_id: 'invite-1',
          proposed_name: 'Deploy Agent',
          description: 'Production deployer',
          status: 'pending',
          agent_id: null,
          rejection_reason: null,
          created_at: '2026-08-20T00:00:00Z',
          reviewed_at: null,
        },
      ],
      refresh: refreshRequests,
    });
    const user = userEvent.setup();
    render(<AgentsPage />);

    await user.click(screen.getByRole('button', { name: 'agents.approve' }));
    expect(approveJoinRequest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'request-1' }),
      { token_name: 'onboarding' },
    );
    await user.click(screen.getByRole('button', { name: 'agents.reject' }));
    expect(rejectJoinRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 'request-1' }));
    expect(refreshRequests).toHaveBeenCalled();
  });
});
