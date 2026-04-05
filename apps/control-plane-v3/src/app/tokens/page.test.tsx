import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import TokensPage from './page';

const useManagementSessionGateMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const useCreateAgentMock = vi.fn();
const useCreateAgentTokenMock = vi.fn();
const useRevokeAgentTokenMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAgents: vi.fn(),
  useAgentsWithTokens: () => useAgentsWithTokensMock(),
  useCreateAgent: () => useCreateAgentMock(),
  useCreateAgentToken: () => useCreateAgentTokenMock(),
  useRevokeAgentToken: () => useRevokeAgentTokenMock(),
}));

describe('tokens page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useManagementSessionGateMock.mockReturnValue({
      session: {
        email: 'owner@example.com',
        role: 'owner',
      },
      loading: false,
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
        },
      ],
      tokensByAgent: {
        bootstrap: [
          {
            id: 'token-1',
            token_prefix: 'cp_tok_123',
            display_name: 'Primary Token',
            status: 'active',
            trust_score: 0.8,
            success_rate: 1,
            scopes: ['runtime'],
            labels: {},
            completed_runs: 3,
            successful_runs: 3,
            issued_by_actor_id: 'human-owner',
            last_used_at: null,
            last_feedback_at: null,
          },
          {
            id: 'token-2',
            token_prefix: 'cp_tok_456',
            display_name: 'Risk Scan Token',
            status: 'active',
            trust_score: 0.45,
            success_rate: 0.5,
            scopes: ['runtime'],
            labels: { pool: 'risk' },
            completed_runs: 2,
            successful_runs: 1,
            issued_by_actor_id: 'human-owner',
            last_used_at: '2026-03-31T00:00:00.000Z',
            last_feedback_at: '2026-03-31T01:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useCreateAgentMock.mockReturnValue(vi.fn());
    useCreateAgentTokenMock.mockReturnValue(vi.fn());
    useRevokeAgentTokenMock.mockReturnValue(vi.fn());
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    const mutateMock = vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'));

    useAgentsWithTokensMock.mockReturnValue({
      ...useAgentsWithTokensMock(),
      mutate: mutateMock,
    });

    render(<TokensPage />);

    await user.click(screen.getByRole('button', { name: /tokens.actions.refresh/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a relogin recovery state when token queries return unauthorized', () => {
    useAgentsWithTokensMock.mockReturnValue({
      ...useAgentsWithTokensMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<TokensPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a forbidden-specific state when token queries return forbidden', () => {
    useAgentsWithTokensMock.mockReturnValue({
      ...useAgentsWithTokensMock(),
      error: new ApiError(403, 'Forbidden'),
    });

    render(<TokensPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('permission');
  });

  it('shows a relogin recovery state when creating an agent hits an expired session', async () => {
    const user = userEvent.setup();
    const createAgentMock = vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'));
    useCreateAgentMock.mockReturnValue(createAgentMock);

    render(<TokensPage />);

    await user.click(screen.getAllByRole('button', { name: /tokens.actions.createAgent/i })[0]);
    await user.type(screen.getByPlaceholderText(/deploy-bot/i), 'Deploy Bot');
    await user.click(screen.getAllByRole('button', { name: /tokens.actions.createAgent/i })[1]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });
  });

  it('shows a forbidden-specific state when minting a token loses permission', async () => {
    const user = userEvent.setup();
    const createTokenMock = vi.fn().mockRejectedValue(new ApiError(403, 'Forbidden'));
    useCreateAgentTokenMock.mockReturnValue(createTokenMock);

    render(<TokensPage />);

    await user.click(screen.getByRole('button', { name: /tokens.actions.mintToken/i }));
    await user.type(screen.getByPlaceholderText(/staging worker token/i), 'Staging Worker');
    await user.click(screen.getAllByRole('button', { name: /tokens.actions.mintToken/i })[1]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('permission');
    });
  });

  it('shows a relogin recovery state when revoking a token hits an expired session', async () => {
    const user = userEvent.setup();
    const revokeAgentTokenMock = vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'));
    useRevokeAgentTokenMock.mockReturnValue(revokeAgentTokenMock);

    render(<TokensPage />);

    await user.click(screen.getAllByRole('button', { name: /tokens.actions.revoke/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });
  });

  it('surfaces token supervision metrics and filters tokens needing feedback', async () => {
    const user = userEvent.setup();

    render(<TokensPage />);

    expect(screen.getByText('1 token needs feedback')).toBeInTheDocument();
    expect(screen.getByText('1 low-trust token')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /needs feedback/i }));

    expect(screen.getByText('Primary Token')).toBeInTheDocument();
    expect(screen.queryByText('Risk Scan Token')).not.toBeInTheDocument();
  });

  it('filters tokens by low trust for human review', async () => {
    const user = userEvent.setup();

    render(<TokensPage />);

    await user.click(screen.getByRole('button', { name: /low trust/i }));

    expect(screen.queryByText('Primary Token')).not.toBeInTheDocument();
    expect(screen.getByText('Risk Scan Token')).toBeInTheDocument();
  });
});
