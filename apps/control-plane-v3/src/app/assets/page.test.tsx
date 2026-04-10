import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import AssetsPage from './page';

let mockSearchParams = new URLSearchParams();
const useManagementSessionGateMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const useSecretsMock = vi.fn();
const useCapabilitiesMock = vi.fn();
const useCreateSecretMock = vi.fn();
const useCreateCapabilityMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAgentsWithTokens: () => useAgentsWithTokensMock(),
}));

vi.mock('@/domains/governance', async () => {
  const actual =
    await vi.importActual<typeof import('@/domains/governance')>('@/domains/governance');
  return {
    ...actual,
    useSecrets: () => useSecretsMock(),
    useCapabilities: () => useCapabilitiesMock(),
    useCreateSecret: () => useCreateSecretMock(),
    useCreateCapability: () => useCreateCapabilityMock(),
  };
});

describe('assets page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

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
          id: 'agent-1',
          name: 'Bootstrap Credential',
        },
      ],
      tokensByAgent: {
        'agent-1': [
          {
            id: 'token-1',
            display_name: 'Primary Token',
            status: 'active',
            labels: {},
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useSecretsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'secret-1',
            display_name: 'OpenAI production key',
            kind: 'api_token',
            provider: 'openai',
            environment: 'production',
            provider_scopes: ['responses.read'],
            resource_selector: 'project:agent-share',
            publication_status: 'pending_review',
          },
          {
            id: 'secret-2',
            display_name: 'Anthropic staging key',
            kind: 'api_token',
            provider: 'anthropic',
            environment: 'staging',
            provider_scopes: ['messages.read'],
            resource_selector: null,
            publication_status: 'active',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'agent-1',
            reviewed_at: '2026-03-31T00:00:00.000Z',
          },
          {
            id: 'secret-3',
            display_name: 'Rejected secret',
            kind: 'api_token',
            provider: 'openai',
            environment: 'staging',
            provider_scopes: ['responses.read'],
            resource_selector: null,
            publication_status: 'rejected',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'agent-1',
            reviewed_at: '2026-03-31T02:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useCapabilitiesMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'capability-1',
            name: 'openai.config.bootstrap',
            secret_id: 'secret-1',
            allowed_mode: 'proxy_or_lease',
            risk_level: 'high',
            lease_ttl_seconds: 120,
            required_provider: 'openai',
            required_provider_scopes: ['responses.read'],
            publication_status: 'pending_review',
            access_policy: {
              mode: 'selectors',
              selectors: [{ kind: 'agent', ids: ['agent-1'] }],
            },
          },
          {
            id: 'capability-2',
            name: 'anthropic.research.query',
            secret_id: 'secret-2',
            allowed_mode: 'proxy_only',
            risk_level: 'medium',
            lease_ttl_seconds: 60,
            required_provider: 'anthropic',
            required_provider_scopes: ['messages.read'],
            publication_status: 'active',
            access_policy: {
              mode: 'all_tokens',
            },
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useCreateSecretMock.mockReturnValue(vi.fn());
    useCreateCapabilityMock.mockReturnValue(vi.fn());
  });

  it('shows a relogin recovery state when governance queries return unauthorized', () => {
    useSecretsMock.mockReturnValue({
      ...useSecretsMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<AssetsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('assets.sessionExpired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a forbidden-specific state when governance queries return forbidden', () => {
    useSecretsMock.mockReturnValue({
      ...useSecretsMock(),
      error: new ApiError(403, 'Forbidden'),
    });

    render(<AssetsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('assets.sessionForbidden');
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    const mutateMock = vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'));

    useSecretsMock.mockReturnValue({
      ...useSecretsMock(),
      mutate: mutateMock,
    });

    render(<AssetsPage />);

    await user.click(screen.getByRole('button', { name: /^common.refresh$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('assets.sessionExpired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when creating a secret hits an expired session', async () => {
    const user = userEvent.setup();
    useCreateSecretMock.mockReturnValue(
      vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'))
    );

    render(<AssetsPage />);

    await user.click(screen.getByRole('button', { name: /^assets.newSecret$/i }));
    await user.click(screen.getByRole('button', { name: /^assets.secrets.create$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('assets.sessionExpired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('surfaces governance coverage and filters assets awaiting human review', async () => {
    const user = userEvent.setup();

    render(<AssetsPage />);

    expect(screen.getByText('2 pending review items')).toBeInTheDocument();
    expect(screen.getByText('2 active assets')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /pending review/i }));

    expect(screen.getByText('OpenAI production key')).toBeInTheDocument();
    expect(screen.getByText('openai.config.bootstrap')).toBeInTheDocument();
    expect(screen.queryByText('Anthropic staging key')).not.toBeInTheDocument();
    expect(screen.queryByText('anthropic.research.query')).not.toBeInTheDocument();
  });

  it('filters governance inventory by publication state and resource lane', async () => {
    const user = userEvent.setup();

    render(<AssetsPage />);

    await user.click(screen.getByRole('button', { name: /active/i }));
    await user.click(screen.getByRole('button', { name: /capabilities/i }));

    expect(screen.queryByText('OpenAI production key')).not.toBeInTheDocument();
    expect(screen.queryByText('openai.config.bootstrap')).not.toBeInTheDocument();
    expect(screen.getByText('anthropic.research.query')).toBeInTheDocument();
  });

  it('treats approved inventory as active while keeping rejected assets out of the active lane', async () => {
    const user = userEvent.setup();

    render(<AssetsPage />);

    await user.click(screen.getByRole('button', { name: /active/i }));

    expect(screen.getByText('Anthropic staging key')).toBeInTheDocument();
    expect(screen.getByText('Approved by human review')).toBeInTheDocument();
    expect(screen.queryByText('Rejected secret')).not.toBeInTheDocument();
  });

  it('selects the focused resource lane and highlights the requested asset', () => {
    mockSearchParams = new URLSearchParams('resourceKind=capability&resourceId=capability-1');

    render(<AssetsPage />);

    expect(screen.getByText('Focused asset')).toBeInTheDocument();
    expect(screen.queryByText('OpenAI production key')).not.toBeInTheDocument();
    expect(screen.getByTestId('capability-card-capability-1')).toHaveAttribute(
      'data-focus-state',
      'focused'
    );
  });
});
