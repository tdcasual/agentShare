import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./vaultgate-api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      public detail: string
    ) {
      super(detail);
    }
  },
  getBootstrapStatus: vi.fn(),
  getCurrentSession: vi.fn(),
}));

import { ApiError, getBootstrapStatus, getCurrentSession } from './vaultgate-api';
import { resolveAppEntryState } from './session';

describe('resolveAppEntryState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns setup_required before initialization', async () => {
    vi.mocked(getBootstrapStatus).mockResolvedValue({ setup_required: true });
    await expect(resolveAppEntryState()).resolves.toEqual({ kind: 'setup_required' });
  });

  it('returns anonymous for an initialized vault without a session', async () => {
    vi.mocked(getBootstrapStatus).mockResolvedValue({ setup_required: false });
    vi.mocked(getCurrentSession).mockRejectedValue(new ApiError(401, 'Unauthorized'));
    await expect(resolveAppEntryState()).resolves.toEqual({ kind: 'anonymous' });
  });

  it('returns authenticated with the exact admin session', async () => {
    vi.mocked(getBootstrapStatus).mockResolvedValue({ setup_required: false });
    vi.mocked(getCurrentSession).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      auth_type: 'session',
    });
    await expect(resolveAppEntryState()).resolves.toEqual({
      kind: 'authenticated',
      session: { id: 'admin-1', email: 'admin@example.com', auth_type: 'session' },
    });
  });

  it('returns unavailable for transport failures', async () => {
    vi.mocked(getBootstrapStatus).mockRejectedValue(new Error('offline'));
    await expect(resolveAppEntryState()).resolves.toEqual({
      kind: 'unavailable',
      error: 'offline',
    });
  });
});
