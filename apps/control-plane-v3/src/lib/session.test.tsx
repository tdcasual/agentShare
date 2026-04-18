import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useManagementSessionGate } from './session';

const replaceMock = vi.fn();
const resolveEntryStateMock = vi.fn();
const setGlobalSessionMock = vi.fn();
const routerMock = {
  replace: replaceMock,
};

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
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

  it('clears the current session before redirecting when authentication expires', async () => {
    resolveEntryStateMock.mockResolvedValueOnce({
      kind: 'authenticated_ready',
      bootstrap: { initialized: true },
      session: {
        email: 'owner@example.com',
        role: 'owner',
        session_id: 'session-1',
      },
    });

    const { result } = renderHook(() => useManagementSessionGate());

    await waitFor(() => {
      expect(result.current.session?.email).toBe('owner@example.com');
    });

    resolveEntryStateMock.mockResolvedValueOnce({
      kind: 'login_required',
      bootstrap: { initialized: true },
    });

    await act(async () => {
      result.current.refreshSession();
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });

    expect(result.current.session).toBeNull();
    expect(setGlobalSessionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'anonymous' })
    );
  });

  it('clears the current session when the entry-state check becomes unavailable', async () => {
    resolveEntryStateMock.mockResolvedValueOnce({
      kind: 'authenticated_ready',
      bootstrap: { initialized: true },
      session: {
        email: 'owner@example.com',
        role: 'owner',
        session_id: 'session-1',
      },
    });

    const { result } = renderHook(() =>
      useManagementSessionGate({ redirectOnMissingSession: false })
    );

    await waitFor(() => {
      expect(result.current.session?.email).toBe('owner@example.com');
    });

    resolveEntryStateMock.mockResolvedValueOnce({
      kind: 'unavailable',
      error: 'backend down',
    });

    await act(async () => {
      result.current.refreshSession();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('backend down');
    });

    expect(result.current.session).toBeNull();
    expect(setGlobalSessionMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'unavailable', error: 'backend down' })
    );
  });
});
