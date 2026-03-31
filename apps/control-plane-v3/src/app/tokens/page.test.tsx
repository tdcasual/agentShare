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
});
