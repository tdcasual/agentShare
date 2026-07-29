import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecuritySettingsPage from './page';

const { replaceMock, refreshMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/security',
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

vi.mock('@/lib/vaultgate-api', () => ({
  changePassword: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public detail: string
    ) {
      super(detail);
    }
  },
}));

import { ApiError, changePassword } from '@/lib/vaultgate-api';

const mockedChangePassword = vi.mocked(changePassword);
const currentPassword = 'Curr3nt!Password2026';
const newPassword = 'N3w!Password#2026';

async function fillForm(
  values = { current: currentPassword, next: newPassword, confirm: newPassword }
) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('settings.security.currentPassword'), values.current);
  await user.type(screen.getByLabelText('settings.security.newPassword'), values.next);
  await user.type(screen.getByLabelText('settings.security.confirmPassword'), values.confirm);
  return user;
}

describe('SecuritySettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('renders the security form and its session consequence', () => {
    render(<SecuritySettingsPage />);

    expect(screen.getByRole('heading', { name: 'settings.security.title' })).toBeInTheDocument();
    expect(screen.getByLabelText('settings.security.currentPassword')).toHaveAttribute(
      'autocomplete',
      'current-password'
    );
    expect(screen.getByLabelText('settings.security.newPassword')).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
    expect(screen.getByText('settings.security.sessionWarning')).toBeInTheDocument();
  });

  it('requires every password field', async () => {
    const user = userEvent.setup();
    render(<SecuritySettingsPage />);

    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));

    expect(screen.getAllByText('settings.security.required')).toHaveLength(3);
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it('rejects mismatched and weak new passwords before calling the API', async () => {
    render(<SecuritySettingsPage />);
    const user = await fillForm({
      current: currentPassword,
      next: newPassword,
      confirm: 'N3w!Mismatch#2026',
    });
    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));
    expect(screen.getByText('settings.security.passwordMismatch')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('settings.security.newPassword'));
    await user.clear(screen.getByLabelText('settings.security.confirmPassword'));
    await user.type(screen.getByLabelText('settings.security.newPassword'), 'weak-password');
    await user.type(screen.getByLabelText('settings.security.confirmPassword'), 'weak-password');
    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));
    expect(screen.getByText('settings.security.passwordTooWeak')).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it('rejects new passwords over the bcrypt byte limit', async () => {
    render(<SecuritySettingsPage />);
    const tooLong = 'Aa1!'.repeat(20);
    const user = await fillForm({ current: currentPassword, next: tooLong, confirm: tooLong });
    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));

    expect(screen.getByText('settings.security.passwordTooLong')).toBeInTheDocument();
    expect(mockedChangePassword).not.toHaveBeenCalled();
  });

  it('maps current-password and password-reuse API failures to their fields', async () => {
    mockedChangePassword.mockRejectedValueOnce(new ApiError(400, 'incorrect'));
    const user = userEvent.setup();
    render(<SecuritySettingsPage />);
    await fillForm();
    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));
    expect(
      await screen.findByText('settings.security.currentPasswordIncorrect')
    ).toBeInTheDocument();

    mockedChangePassword.mockRejectedValueOnce(new ApiError(409, 'reuse'));
    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));
    expect(await screen.findByText('settings.security.passwordReuse')).toBeInTheDocument();
  });

  it('shows network errors without losing the form', async () => {
    mockedChangePassword.mockRejectedValueOnce(new ApiError(0, 'offline'));
    render(<SecuritySettingsPage />);
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('common.networkError');
    expect(screen.getByLabelText('settings.security.currentPassword')).toHaveValue(currentPassword);
  });

  it('disables inputs while submitting and redirects after success', async () => {
    let resolveRequest: (() => void) | undefined;
    mockedChangePassword.mockImplementationOnce(
      () => new Promise<void>((resolve) => (resolveRequest = resolve))
    );
    render(<SecuritySettingsPage />);
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'settings.security.submit' }));

    expect(mockedChangePassword).toHaveBeenCalledWith({
      current_password: currentPassword,
      new_password: newPassword,
    });
    expect(screen.getByLabelText('settings.security.currentPassword')).toBeDisabled();
    resolveRequest?.();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(window.sessionStorage.getItem('vaultgate-password-changed')).toBe('1');
  });

  it('toggles password visibility with an accessible icon button', async () => {
    const user = userEvent.setup();
    render(<SecuritySettingsPage />);
    const input = screen.getByLabelText('settings.security.currentPassword');

    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getAllByRole('button', { name: 'settings.security.showPassword' })[0]);
    expect(input).toHaveAttribute('type', 'text');
  });
});
