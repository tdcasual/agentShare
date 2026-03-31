import { describe, expect, it } from 'vitest';
import type { BootstrapStatus, ManagementSessionSummary } from '@/shared/types';
import { ApiError } from '@/lib/api-client';
import { resolveEntryState } from './entry-state';

function createBootstrapStatus(overrides: Partial<BootstrapStatus> = {}): BootstrapStatus {
  return {
    initialized: true,
    ...overrides,
  };
}

function createSession(overrides: Partial<ManagementSessionSummary> = {}): ManagementSessionSummary {
  return {
    id: 'session-1',
    session_id: 'session-1',
    email: 'owner@example.com',
    role: 'owner',
    status: 'authenticated',
    created_at: '2026-03-31T00:00:00Z',
    expires_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

describe('resolveEntryState', () => {
  it('returns bootstrap_required when bootstrap is not initialized', async () => {
    const state = await resolveEntryState({
      getBootstrapStatus: async () => createBootstrapStatus({ initialized: false }),
      getSession: async () => createSession(),
    });

    expect(state.kind).toBe('bootstrap_required');
  });

  it('returns login_required when bootstrap is ready and session is unauthorized', async () => {
    const state = await resolveEntryState({
      getBootstrapStatus: async () => createBootstrapStatus(),
      getSession: async () => {
        throw new ApiError(401, 'Missing management session');
      },
    });

    expect(state.kind).toBe('login_required');
  });

  it('returns authenticated_ready when bootstrap is ready and session is valid', async () => {
    const session = createSession();
    const state = await resolveEntryState({
      getBootstrapStatus: async () => createBootstrapStatus(),
      getSession: async () => session,
    });

    expect(state).toEqual({
      kind: 'authenticated_ready',
      bootstrap: createBootstrapStatus(),
      session,
    });
  });

  it('returns unavailable when bootstrap resolution fails operationally', async () => {
    const state = await resolveEntryState({
      getBootstrapStatus: async () => {
        throw new ApiError(503, 'Backend unavailable');
      },
      getSession: async () => createSession(),
    });

    expect(state.kind).toBe('unavailable');
  });
});
