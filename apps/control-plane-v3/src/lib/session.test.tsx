import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useManagementSessionGate } from './session';

const replaceMock = vi.fn();
const resolveEntryStateMock = vi.fn();
const setGlobalSessionMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    getBootstrapStatus: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock('@/lib/entry-state', () => ({
  resolveEntryState: (...args: unknown[]) => resolveEntryStateMock(...args),
}));

vi.mock('@/lib/session-state', () => ({
  setGlobalSession: (...args: unknown[]) => setGlobalSessionMock(...args),
}));

describe('useManagementSessionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login by default when the entry state requires authentication', async () => {
    resolveEntryStateMock.mockResolvedValue({
      kind: 'login_required',
      bootstrap: { initialized: true },
    });

    renderHook(() => useManagementSessionGate());

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
  });

  it('can stay on the current page when authentication is missing and redirects are disabled', async () => {
    resolveEntryStateMock.mockResolvedValue({
      kind: 'login_required',
      bootstrap: { initialized: true },
    });

    const { result } = renderHook(() =>
      useManagementSessionGate({ redirectOnMissingSession: false })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
