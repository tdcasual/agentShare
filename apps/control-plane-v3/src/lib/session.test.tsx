import { describe, expect, it, vi } from 'vitest';
import { resolveAppEntryState } from './session';

const setGlobalSessionMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    getBootstrapStatus: vi.fn(),
    getSession: vi.fn(),
  },
}));

vi.mock('@/lib/entry-state', () => ({
  resolveEntryStateFast: vi.fn(),
}));

vi.mock('@/lib/session-state', () => ({
  setGlobalSession: (...args: unknown[]) => setGlobalSessionMock(...args),
}));

describe('resolveAppEntryState', () => {
  it('syncs authenticated session to global state', async () => {
    const { resolveEntryStateFast } = await import('@/lib/entry-state');
    const mocked = vi.mocked(resolveEntryStateFast);

    mocked.mockResolvedValue({
      kind: 'authenticated_ready',
      bootstrap: { initialized: true },
      session: {
        email: 'owner@example.com',
        role: 'owner',
        session_id: 'session-1',
      },
    } as never);

    const result = await resolveAppEntryState();

    expect(result.kind).toBe('authenticated_ready');
    expect(setGlobalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'authenticated',
        email: 'owner@example.com',
        role: 'owner',
      })
    );
  });

  it('syncs anonymous state when login is required', async () => {
    const { resolveEntryStateFast } = await import('@/lib/entry-state');
    const mocked = vi.mocked(resolveEntryStateFast);

    mocked.mockResolvedValue({
      kind: 'login_required',
      bootstrap: { initialized: true },
    } as never);

    const result = await resolveAppEntryState();

    expect(result.kind).toBe('login_required');
    expect(setGlobalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'anonymous' })
    );
  });

  it('syncs unavailable state with error', async () => {
    const { resolveEntryStateFast } = await import('@/lib/entry-state');
    const mocked = vi.mocked(resolveEntryStateFast);

    mocked.mockResolvedValue({
      kind: 'unavailable',
      error: 'backend down',
    } as never);

    const result = await resolveAppEntryState();

    expect(result.kind).toBe('unavailable');
    expect(setGlobalSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'unavailable', error: 'backend down' })
    );
  });
});
