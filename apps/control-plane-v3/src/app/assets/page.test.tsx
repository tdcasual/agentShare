import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import AssetsPage from './page';

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

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAgentsWithTokens: () => useAgentsWithTokensMock(),
}));

vi.mock('@/domains/governance', () => ({
  useSecrets: () => useSecretsMock(),
  useCapabilities: () => useCapabilitiesMock(),
  useCreateSecret: () => useCreateSecretMock(),
  useCreateCapability: () => useCreateCapabilityMock(),
}));

describe('assets page', () => {
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
          id: 'agent-1',
          name: 'Bootstrap Agent',
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
        items: [],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useCapabilitiesMock.mockReturnValue({
      data: {
        items: [],
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

    expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
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
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
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
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });
});
