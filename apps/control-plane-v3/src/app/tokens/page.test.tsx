import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { translateMessage } from '@/test-utils/i18n-mock';
import TokensPage from './page';

const t = translateMessage;

const useGlobalSessionMock = vi.fn();
const useAccessTokensMock = vi.fn();
const useCreateAccessTokenMock = vi.fn();
const useRevokeAccessTokenMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
  }),
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session-state', () => ({
  useGlobalSession: () => useGlobalSessionMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAccessTokens: () => useAccessTokensMock(),
  useCreateAccessToken: () => useCreateAccessTokenMock(),
  useRevokeAccessToken: () => useRevokeAccessTokenMock(),
}));

describe('tokens page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useGlobalSessionMock.mockReturnValue({
      state: 'authenticated',
      email: 'owner@example.com',
      role: 'owner',
      sessionId: 'session-1',
      lastLoadedAt: Date.now(),
      summary: { email: 'owner@example.com', role: 'owner', session_id: 'session-1' },
    });

    useAccessTokensMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'token-1',
            tokenPrefix: 'cp_tok_123',
            displayName: 'Primary Token',
            status: 'active',
            subjectType: 'automation',
            subjectId: 'github-actions',
            trustScore: 0.8,
            successRate: 1,
            scopes: ['runtime'],
            labels: {},
            policy: {},
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
            subjectType: 'automation',
            subjectId: 'risk-worker',
            trustScore: 0.45,
            successRate: 0.5,
            scopes: ['runtime'],
            labels: { pool: 'risk' },
            policy: {},
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

    useCreateAccessTokenMock.mockReturnValue(vi.fn());
    useRevokeAccessTokenMock.mockReturnValue(vi.fn());
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    const mutateMock = vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'));

    useAccessTokensMock.mockReturnValue({
      ...useAccessTokensMock(),
      mutate: mutateMock,
    });

    render(<TokensPage />);

    await user.click(screen.getByRole('button', { name: t('tokens.actions.refresh') }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: t('auth.logout.continueToLogin') })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when token queries return unauthorized', () => {
    useAccessTokensMock.mockReturnValue({
      ...useAccessTokensMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<TokensPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionExpired'));
    expect(screen.getByRole('link', { name: t('auth.logout.continueToLogin') })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a forbidden-specific state when token queries return forbidden', () => {
    useAccessTokensMock.mockReturnValue({
      ...useAccessTokensMock(),
      error: new ApiError(403, 'Forbidden'),
    });

    render(<TokensPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionForbidden'));
  });

  it('renders standalone access tokens without agent grouping', () => {
    render(<TokensPage />);

    expect(
      screen.queryByRole('button', { name: t('tokens.actions.createAgent') })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t('tokens.actions.issueAccessToken') })
    ).toBeInTheDocument();
  });

  it('shows a forbidden-specific state when minting a token loses permission', async () => {
    const user = userEvent.setup();
    const createTokenMock = vi.fn().mockRejectedValue(new ApiError(403, 'Forbidden'));
    useCreateAccessTokenMock.mockReturnValue(createTokenMock);

    render(<TokensPage />);

    await user.click(screen.getByRole('button', { name: t('tokens.actions.issueAccessToken') }));
    await user.type(
      screen.getByPlaceholderText(t('tokens.form.displayNamePlaceholder')),
      'Staging Worker'
    );
    await user.type(
      screen.getByPlaceholderText(t('tokens.form.subjectIdPlaceholder')),
      'staging-worker'
    );
    await user.click(
      screen.getAllByRole('button', { name: t('tokens.actions.issueAccessToken') })[1]
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('tokens.sessionForbidden'));
    });
  });

  it('shows a relogin recovery state when revoking a token hits an expired session', async () => {
    const user = userEvent.setup();
    const revokeAccessTokenMock = vi
      .fn()
      .mockRejectedValue(new ApiError(401, 'Missing management session'));
    useRevokeAccessTokenMock.mockReturnValue(revokeAccessTokenMock);

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
    expect(screen.getAllByText(t('tokens.remoteAccessSupervisionDesc')).length).toBeGreaterThan(0);

    expect(
      screen.getByText(t('tokens.badge.needsFeedback', { count: 1, suffix: '', verbSuffix: '' }))
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
    expect(screen.getAllByText(t('tokens.remoteAccessSupervisionDesc')).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/Creating an agent automatically mints its primary token/i)
    ).not.toBeInTheDocument();
  });

  it('localizes session, agent, and token status labels instead of leaking raw enums', () => {
    render(<TokensPage />);

    expect(screen.getByText(t('settings.roles.owner'))).toBeInTheDocument();
    expect(screen.getAllByText(t('common.active')).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/^owner$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^active$/)).not.toBeInTheDocument();
  });
});
