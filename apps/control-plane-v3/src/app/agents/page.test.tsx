import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createAgentInvite } from '@/domains/agent';
import AgentsPage from './page';

vi.mock('@/domains/agent', () => ({
  useAgents: () => ({
    agents: [{ id: 'agent-1', name: 'Deploy Agent', description: 'Production', status: 'active' }],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
  createAgent: vi.fn(),
  createAgentInvite: vi.fn(),
  useAgentJoinRequests: () => ({ requests: [], refresh: vi.fn() }),
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
});
