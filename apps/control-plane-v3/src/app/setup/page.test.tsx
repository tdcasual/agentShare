import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SetupPage from './page';

vi.mock('@/lib/vaultgate-api', () => ({
  getBootstrapStatus: vi.fn(),
  bootstrap: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public detail: string
    ) {
      super(detail);
    }
  },
}));

import { bootstrap, getBootstrapStatus } from '@/lib/vaultgate-api';

const mockedStatus = vi.mocked(getBootstrapStatus);
const mockedBootstrap = vi.mocked(bootstrap);

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedStatus.mockResolvedValue({ setup_required: true, bootstrap_token_required: false });
  });

  async function fillAndSubmit(password: string) {
    const user = userEvent.setup();
    render(<SetupPage />);
    const emailInput = await screen.findByLabelText('auth.login.email');
    await user.type(emailInput, 'admin@example.com');
    await user.type(screen.getByLabelText('auth.login.password'), password);
    await user.type(screen.getByLabelText('setup.confirmPassword'), password);
    await user.click(screen.getByRole('button', { name: 'setup.createAccount' }));
  }

  it('rejects passwords missing required character classes', async () => {
    await fillAndSubmit('aaaaaaaaaaaa');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('setup.passwordTooWeak');
    });
    expect(mockedBootstrap).not.toHaveBeenCalled();
  });

  it('rejects passwords longer than 72 UTF-8 bytes', async () => {
    // 80 bytes with all character classes present.
    await fillAndSubmit('Aa1!'.repeat(20));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('setup.passwordTooLong');
    });
    expect(mockedBootstrap).not.toHaveBeenCalled();
  });

  it('submits passwords that satisfy the backend policy', async () => {
    mockedBootstrap.mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com' });
    await fillAndSubmit('Str0ng!Pass#2026');

    await waitFor(() => {
      expect(mockedBootstrap).toHaveBeenCalledWith(
        { email: 'admin@example.com', password: 'Str0ng!Pass#2026' },
        undefined
      );
    });
  });
});
