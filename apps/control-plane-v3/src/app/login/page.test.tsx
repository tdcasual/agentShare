import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '@/lib/api';
import LoginPage from './page';

const replaceMock = vi.fn();
const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: originalLocation,
  });
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'en',
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
      login: vi.fn(),
    },
  };
});

describe('login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getBootstrapStatus).mockResolvedValue({ initialized: true });
    vi.mocked(api.login).mockResolvedValue({
      status: 'active',
      actor_type: 'human',
      actor_id: 'viewer-1',
      role: 'viewer',
      auth_method: 'password',
      session_id: 'session-1',
      email: 'viewer@example.com',
      expires_in: 3600,
      issued_at: 0,
      expires_at: 3600,
    });
  });

  it('redirects non-admin users to the first route they are allowed to access', async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await waitFor(() => {
      expect(api.getBootstrapStatus).toHaveBeenCalled();
    });

    await user.type(screen.getByLabelText('auth.login.email'), 'viewer@example.com');
    await user.type(screen.getByLabelText('auth.login.password'), 'correct horse battery staple');
    await user.click(screen.getByRole('button', { name: /auth\.login\.signIn/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        email: 'viewer@example.com',
        password: 'correct horse battery staple',
      });
    });

    expect(window.location.href).toBe('/playbooks');
  });

  it('shows API errors from failed sign-in attempts', async () => {
    const user = userEvent.setup();
    vi.mocked(api.login).mockRejectedValue(new ApiError(401, 'Invalid credentials'));

    render(<LoginPage />);

    await waitFor(() => {
      expect(api.getBootstrapStatus).toHaveBeenCalled();
    });

    await user.type(screen.getByLabelText('auth.login.email'), 'viewer@example.com');
    await user.type(screen.getByLabelText('auth.login.password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /auth\.login\.signIn/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Invalid credentials');
    });

    expect(window.location.href).toBe('');
  });
});
