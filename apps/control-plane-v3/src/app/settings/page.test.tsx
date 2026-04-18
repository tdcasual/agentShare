import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { translateMessage } from '@/test-utils/i18n-mock';
import SettingsPage from './page';

const t = translateMessage;
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
          {
            id: 'operator-1',
            email: 'operator@example.com',
            display_name: 'Operator',
            role: 'operator',
            status: 'active',
            last_login_at: '2026-03-31T00:00:00.000Z',
          },
          {
            id: 'viewer-1',
            email: 'viewer@example.com',
            display_name: 'Viewer',
            role: 'viewer',
            status: 'inactive',
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

    expect(screen.getByRole('alert')).toHaveTextContent(t('settings.sessionExpired'));
    expect(screen.getByRole('link', { name: t('auth.logout.continueToLogin') })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a forbidden-specific state when account queries return forbidden', () => {
    useAdminAccountsMock.mockReturnValue({
      ...useAdminAccountsMock(),
      error: new ApiError(403, 'Forbidden'),
    });

    render(<SettingsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('settings.sessionForbidden'));
  });

  it('shows a relogin recovery state when inviting an operator hits an expired session', async () => {
    const user = userEvent.setup();
    useCreateAdminAccountMock.mockReturnValue(
      vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'))
    );

    render(<SettingsPage />);

    await user.type(
      screen.getByPlaceholderText(t('settings.emailPlaceholder')),
      'operator@example.com'
    );
    await user.type(screen.getByPlaceholderText(t('settings.displayNamePlaceholder')), 'Operator');
    await user.type(screen.getByPlaceholderText(t('settings.passwordPlaceholder')), 'password-123');
    await user.click(screen.getByRole('button', { name: new RegExp(`^${t('settings.inviteAccount')}$`, 'i') }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('settings.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: t('auth.logout.continueToLogin') })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('surfaces supervision coverage and filters the roster by role', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    expect(screen.getByText(`1 ${t('settings.ownerAccounts')}`)).toBeInTheDocument();
    expect(screen.getByText(`2 ${t('settings.activeOperators')}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t('settings.rosterOperators') }));

    expect(screen.queryByRole('heading', { level: 3, name: 'Owner' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Operator' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Viewer' })).not.toBeInTheDocument();
  });

  it('filters the roster to accounts needing human follow-up', async () => {
    const user = userEvent.setup();

    render(<SettingsPage />);

    await user.click(screen.getByRole('button', { name: t('settings.rosterInactive') }));

    expect(screen.queryByRole('heading', { level: 3, name: 'Owner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Operator' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Viewer' })).toBeInTheDocument();
  });

  it('renders localized role and status badges in the management roster', () => {
    render(<SettingsPage />);

    expect(screen.getAllByText(t('settings.roles.owner')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t('settings.roles.operator')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t('settings.roles.viewer')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t('settings.status.active')).length).toBeGreaterThan(0);
    expect(screen.getByText(t('settings.status.inactive'))).toBeInTheDocument();
    expect(screen.queryByText(/^owner$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^operator$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^viewer$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^inactive$/)).not.toBeInTheDocument();
  });
});
