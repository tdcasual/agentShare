import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '@/lib/api';
import SetupPage from './page';

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock('@/components/theme-toggle', () => ({
  SimpleThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      getBootstrapStatus: vi.fn(),
      setupOwner: vi.fn(),
    },
  };
});

describe('setup page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getBootstrapStatus).mockResolvedValue({ initialized: false });
    vi.mocked(api.setupOwner).mockResolvedValue({
      initialized: true,
      account: {
        id: 'owner-1',
        email: 'owner@example.com',
        display_name: 'Founding Owner',
        role: 'owner',
        status: 'active',
      },
    });
  });

  it('submits the owner bootstrap form and routes to login', async () => {
    const user = userEvent.setup();

    render(<SetupPage />);

    await waitFor(() => {
      expect(api.getBootstrapStatus).toHaveBeenCalled();
    });

    await user.type(
      screen.getByPlaceholderText('auth.setup.bootstrapKeyPlaceholder'),
      'changeme-bootstrap-key'
    );
    await user.type(screen.getByPlaceholderText('auth.setup.emailPlaceholder'), 'owner@example.com');
    await user.type(
      screen.getByPlaceholderText('auth.setup.displayNamePlaceholder'),
      'Founding Owner'
    );
    await user.type(
      screen.getByPlaceholderText('auth.setup.passwordPlaceholder'),
      'correct horse battery staple'
    );
    await user.click(screen.getByRole('button', { name: /auth\.setup\.createAccount/i }));

    await waitFor(() => {
      expect(api.setupOwner).toHaveBeenCalledWith({
        bootstrap_key: 'changeme-bootstrap-key',
        email: 'owner@example.com',
        display_name: 'Founding Owner',
        password: 'correct horse battery staple',
      });
    });

    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('shows an API error when bootstrap submission fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.setupOwner).mockRejectedValue(new ApiError(401, 'Invalid bootstrap credential'));

    render(<SetupPage />);

    await waitFor(() => {
      expect(api.getBootstrapStatus).toHaveBeenCalled();
    });

    await user.type(
      screen.getByPlaceholderText('auth.setup.bootstrapKeyPlaceholder'),
      'wrong-key'
    );
    await user.type(screen.getByPlaceholderText('auth.setup.emailPlaceholder'), 'owner@example.com');
    await user.type(
      screen.getByPlaceholderText('auth.setup.displayNamePlaceholder'),
      'Founding Owner'
    );
    await user.type(
      screen.getByPlaceholderText('auth.setup.passwordPlaceholder'),
      'correct horse battery staple'
    );
    await user.click(screen.getByRole('button', { name: /auth\.setup\.createAccount/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid bootstrap credential');
    });

    expect(pushMock).not.toHaveBeenCalled();
  });
});
