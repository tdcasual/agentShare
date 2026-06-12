import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getGlobalSession, setGlobalSession, subscribeToSession, resolveSession, logout } from './session-state';

// Mock the API module
vi.mock('@/lib/vaultgate-api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/store/role-store', () => ({
  useRoleStore: {
    getState: () => ({
      clearRole: vi.fn(),
    }),
  },
}));

import { apiFetch } from '@/lib/vaultgate-api';
const mockedApiFetch = vi.mocked(apiFetch);

describe('session-state', () => {
  beforeEach(() => {
    // Reset global session to unknown
    setGlobalSession({ state: 'unknown' });
    vi.clearAllMocks();
  });

  describe('getGlobalSession / setGlobalSession', () => {
    it('returns initial unknown state', () => {
      const session = getGlobalSession();
      expect(session.state).toBe('unknown');
    });

    it('updates global session', () => {
      setGlobalSession({ state: 'authenticated', email: 'test@test.com', role: 'admin' });
      const session = getGlobalSession();
      expect(session.state).toBe('authenticated');
      expect(session.email).toBe('test@test.com');
    });
  });

  describe('subscribeToSession', () => {
    it('notifies listeners on session change', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSession(listener);

      setGlobalSession({ state: 'anonymous' });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ state: 'anonymous' }));

      unsubscribe();
    });

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSession(listener);

      unsubscribe();
      setGlobalSession({ state: 'anonymous' });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('resolveSession', () => {
    it('returns authenticated session on success', async () => {
      mockedApiFetch.mockResolvedValueOnce({
        status: 'active',
        actor_type: 'human',
        actor_id: '123',
        role: 'admin',
        auth_method: 'session',
        session_id: 'sess_1',
        email: 'test@test.com',
        expires_in: 43200,
        issued_at: 0,
        expires_at: 43200,
      });

      const session = await resolveSession();

      expect(session.state).toBe('authenticated');
      expect(session.email).toBe('test@test.com');
    });

    it('returns anonymous on 401', async () => {
      const { ApiError } = await import('@/lib/vaultgate-api');
      mockedApiFetch.mockRejectedValueOnce(new ApiError(401, 'Unauthorized'));

      const session = await resolveSession();

      expect(session.state).toBe('anonymous');
    });

    it('returns forbidden on 403', async () => {
      const { ApiError } = await import('@/lib/vaultgate-api');
      mockedApiFetch.mockRejectedValueOnce(new ApiError(403, 'Forbidden'));

      const session = await resolveSession();

      expect(session.state).toBe('forbidden');
    });

    it('returns unavailable on other errors', async () => {
      mockedApiFetch.mockRejectedValueOnce(new Error('Network error'));

      const session = await resolveSession();

      expect(session.state).toBe('unavailable');
    });
  });

  describe('logout', () => {
    it('calls logout endpoint and clears session', async () => {
      mockedApiFetch.mockResolvedValueOnce({ status: 'logged_out' });

      await logout();

      expect(mockedApiFetch).toHaveBeenCalledWith('/session/logout', { method: 'POST' });
      expect(getGlobalSession().state).toBe('anonymous');
    });
  });
});
