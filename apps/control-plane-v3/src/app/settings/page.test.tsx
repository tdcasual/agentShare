import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import SettingsPage from './page';

const useRouterMock = vi.fn();
const useManagementSessionGateMock = vi.fn();
const useAdminAccountsMock = vi.fn();
const useCreateAdminAccountMock = vi.fn();
const useDisableAdminAccountMock = vi.fn();
const useLogoutMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock(),
}));

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
  useAdminAccounts: () => useAdminAccountsMock(),
  useCreateAdminAccount: () => useCreateAdminAccountMock(),
  useDisableAdminAccount: () => useDisableAdminAccountMock(),
  useLogout: () => useLogoutMock(),
}));

describe('settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useRouterMock.mockReturnValue({
      push: vi.fn(),
    });

    useManagementSessionGateMock.mockReturnValue({
      session: {
        actor_id: 'owner-1',
        email: 'owner@example.com',
        role: 'owner',
        session_id: 'session-1',
        expires_at: '2026-04-01T00:00:00.000Z',
      },
      loading: false,
      error: null,
    });

    useAdminAccountsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'owner-1',
            email: 'owner@example.com',
            display_name: 'Owner',
            role: 'owner',
            status: 'active',
            last_login_at: null,
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useCreateAdminAccountMock.mockReturnValue(vi.fn());
    useDisableAdminAccountMock.mockReturnValue(vi.fn());
    useLogoutMock.mockReturnValue(vi.fn());
  });

  it('shows a relogin recovery state when account queries return unauthorized', () => {
    useAdminAccountsMock.mockReturnValue({
      ...useAdminAccountsMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<SettingsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a relogin recovery state when inviting an operator hits an expired session', async () => {
    const user = userEvent.setup();
    useCreateAdminAccountMock.mockReturnValue(
      vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'))
    );

    render(<SettingsPage />);

    await user.type(screen.getByPlaceholderText('operator@example.com'), 'operator@example.com');
    await user.type(screen.getByPlaceholderText(/settings.displayNamePlaceholder/i), 'Operator');
    await user.type(screen.getByPlaceholderText(/settings.passwordPlaceholder/i), 'password-123');
    await user.click(screen.getByRole('button', { name: /^settings.inviteAccount$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });
});
