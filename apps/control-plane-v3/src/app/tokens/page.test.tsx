import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { translateMessage } from '@/test-utils/i18n-mock';
import TokensPage from './page';

const t = translateMessage;

const useManagementSessionGateMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const useCreateAgentMock = vi.fn();
const useCreateAgentTokenMock = vi.fn();
const useRevokeAgentTokenMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
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
          name: 'Bootstrap Credential',
          risk_tier: 'high',
          auth_method: 'api_key',
          status: 'active',
        },
      ],
      tokensByAgent: {
        bootstrap: [
          {
            id: 'token-1',
            tokenPrefix: 'cp_tok_123',
            displayName: 'Primary Token',
            status: 'active',
            trustScore: 0.8,
            successRate: 1,
            scopes: ['runtime'],
            labels: {},
            completedRuns: 3,
            successfulRuns: 3,
            issuedByActorId: 'human-owner',
            lastUsedAt: undefined,
            lastFeedbackAt: undefined,
          },
          {
            id: 'token-2',
            tokenPrefix: 'cp_tok_456',
            displayName: 'Risk Scan Token',
            status: 'active',
            trustScore: 0.45,
            successRate: 0.5,
            scopes: ['runtime'],
            labels: { pool: 'risk' },
            completedRuns: 2,
            successfulRuns: 1,
            issuedByActorId: 'human-owner',
            lastUsedAt: '2026-03-31T00:00:00.000Z',
            lastFeedbackAt: '2026-03-31T01:00:00.000Z',
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

    await user.click(screen.getByRole('button', { name: t('tokens.actions.refresh') }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when token queries return unauthorized', () => {
    useAgentsWithTokensMock.mockReturnValue({
      ...useAgentsWithTokensMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<TokensPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionExpired'));
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a forbidden-specific state when token queries return forbidden', () => {
    useAgentsWithTokensMock.mockReturnValue({
      ...useAgentsWithTokensMock(),
      error: new ApiError(403, 'Forbidden'),
    });

    render(<TokensPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionForbidden'));
  });

  it('shows a relogin recovery state when creating an agent hits an expired session', async () => {
    const user = userEvent.setup();
    const createAgentMock = vi
      .fn()
      .mockRejectedValue(new ApiError(401, 'Missing management session'));
    useCreateAgentMock.mockReturnValue(createAgentMock);

    render(<TokensPage />);

    await user.click(screen.getAllByRole('button', { name: t('tokens.actions.createAgent') })[0]);
    await user.type(
      screen.getByPlaceholderText(t('tokens.form.agentNamePlaceholder')),
      'Deploy Bot'
    );
    await user.click(screen.getAllByRole('button', { name: t('tokens.actions.createAgent') })[1]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionExpired'));
    });
  });

  it('shows a forbidden-specific state when minting a token loses permission', async () => {
    const user = userEvent.setup();
    const createTokenMock = vi.fn().mockRejectedValue(new ApiError(403, 'Forbidden'));
    useCreateAgentTokenMock.mockReturnValue(createTokenMock);

    render(<TokensPage />);

    await user.click(screen.getByRole('button', { name: t('tokens.actions.mintToken') }));
    await user.type(
      screen.getByPlaceholderText(t('tokens.form.displayNamePlaceholder')),
      'Staging Worker'
    );
    await user.click(screen.getAllByRole('button', { name: t('tokens.actions.mintToken') })[1]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionForbidden'));
    });
  });

  it('shows a relogin recovery state when revoking a token hits an expired session', async () => {
    const user = userEvent.setup();
    const revokeAgentTokenMock = vi
      .fn()
      .mockRejectedValue(new ApiError(401, 'Missing management session'));
    useRevokeAgentTokenMock.mockReturnValue(revokeAgentTokenMock);

    render(<TokensPage />);

    await user.click(screen.getAllByRole('button', { name: t('tokens.actions.revoke') })[0]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionExpired'));
    });
  });

  it('surfaces token supervision metrics and filters tokens needing feedback', async () => {
    const user = userEvent.setup();

    render(<TokensPage />);

    expect(
      screen.getByRole('heading', { name: t('tokens.remoteAccessSupervision') })
    ).toBeInTheDocument();
    expect(screen.getByText(t('tokens.remoteAccessSupervisionDesc'))).toBeInTheDocument();

    expect(
      screen.getByText(t('tokens.badge.needsFeedback', { count: 1, suffix: '', verbSuffix: 's' }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(t('tokens.badge.lowTrust', { count: 1, suffix: '' }))
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t('tokens.filters.needsFeedback') }));

    expect(screen.getByText('Primary Token')).toBeInTheDocument();
    expect(screen.queryByText('Risk Scan Token')).not.toBeInTheDocument();
  });

  it('filters tokens by low trust for human review', async () => {
    const user = userEvent.setup();

    render(<TokensPage />);

    await user.click(screen.getByRole('button', { name: t('tokens.filters.lowTrust') }));

    expect(screen.queryByText('Primary Token')).not.toBeInTheDocument();
    expect(screen.getByText('Risk Scan Token')).toBeInTheDocument();
  });

  it('frames tokens as remote external access instead of internal runtime identity', () => {
    render(<TokensPage />);

    expect(
      screen.getByRole('heading', { name: t('tokens.remoteAccessSupervision') })
    ).toBeInTheDocument();
    expect(screen.getByText(t('tokens.remoteAccessSupervisionDesc'))).toBeInTheDocument();
    expect(
      screen.queryByText(/Creating an agent automatically mints its primary token/i)
    ).not.toBeInTheDocument();
  });
});
