import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

// Mock the API module
vi.mock('@/lib/vaultgate-api', () => ({
  login: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public detail: string
    ) {
      super(detail);
    }
  },
}));

import { ApiError, login } from '@/lib/vaultgate-api';

const mockedLogin = vi.mocked(login);

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('renders the login form', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /auth\.login\.title/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/auth\.login\.email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth\.login\.password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /auth\.login\.signIn/i })).toBeInTheDocument();
  });

  it('shows and consumes the password-changed notice', async () => {
    window.sessionStorage.setItem('vaultgate-password-changed', '1');
    render(<LoginPage />);

    expect(await screen.findByRole('status')).toHaveTextContent('auth.login.passwordChanged');
    expect(window.sessionStorage.getItem('vaultgate-password-changed')).toBeNull();
  });

  it('submits credentials on form submit', async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValueOnce({ status: 'authenticated', email: 'test@test.com' });

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/auth\.login\.email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/auth\.login\.password/i), 'Str0ng!Pass#2026');
    await user.click(screen.getByRole('button', { name: /auth\.login\.signIn/i }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'Str0ng!Pass#2026',
      });
    });
  });

  it('displays error message on login failure', async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValueOnce(new ApiError(401, 'Invalid credentials'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/auth\.login\.email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/auth\.login\.password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /auth\.login\.signIn/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('auth.login.failed');
    });
  });

  it('displays a rate limit message when login returns 429', async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValueOnce(new ApiError(429, 'Too many attempts'));

    render(<LoginPage />);

    await user.type(screen.getByLabelText(/auth\.login\.email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/auth\.login\.password/i), 'Str0ng!Pass#2026');
    await user.click(screen.getByRole('button', { name: /auth\.login\.signIn/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('auth.login.rateLimited');
    });
  });
});
