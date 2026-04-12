import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGlobalSession,
  setGlobalSession,
  subscribeToSession,
  resolveSession,
  login,
  logout,
} from './session-state';
import { apiFetch } from './api-client';

vi.mock('./api-client', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
    }
  },
}));

describe('session-state', () => {
  beforeEach(() => {
    setGlobalSession({ state: 'unknown' });
    vi.clearAllMocks();
  });

  describe('global session', () => {
    it('starts as unknown', () => {
      expect(getGlobalSession()).toEqual({ state: 'unknown' });
    });

    it('updates global session and notifies listeners', () => {
      const listener = vi.fn();
      subscribeToSession(listener);

      setGlobalSession({ state: 'authenticated', email: 'a@b.com', role: 'admin' });

      expect(getGlobalSession()).toEqual({
        state: 'authenticated',
        email: 'a@b.com',
        role: 'admin',
      });
      expect(listener).toHaveBeenCalledWith({
        state: 'authenticated',
        email: 'a@b.com',
        role: 'admin',
      });
    });

    it('unsubscribes listeners', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSession(listener);
      unsubscribe();

      setGlobalSession({ state: 'anonymous' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('resolveSession', () => {
    it('returns authenticated data on success', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        email: 'a@b.com',
        role: 'admin',
        session_id: 'sess-1',
      });

      const result = await resolveSession();
      expect(result.state).toBe('authenticated');
      expect(result.email).toBe('a@b.com');
      expect(result.role).toBe('admin');
      expect(result.sessionId).toBe('sess-1');
      expect(result.lastLoadedAt).toBeTypeOf('number');
    });

    it('returns anonymous on 401', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new (await import('./api-client')).ApiError(401, 'Unauthorized'));

      const result = await resolveSession();
      expect(result.state).toBe('anonymous');
    });

    it('returns forbidden on 403', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new (await import('./api-client')).ApiError(403, 'Forbidden'));

      const result = await resolveSession();
      expect(result.state).toBe('forbidden');
      expect(result.error).toBe('Forbidden');
    });

    it('returns unavailable on network error', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error('Network failure'));

      const result = await resolveSession();
      expect(result.state).toBe('unavailable');
      expect(result.error).toBe('Network failure');
    });
  });

  describe('login', () => {
    it('sets global session on success', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        email: 'a@b.com',
        role: 'admin',
        session_id: 'sess-1',
      });

      const result = await login('a@b.com', 'pw');
      expect(result.state).toBe('authenticated');
      expect(getGlobalSession().state).toBe('authenticated');
    });

    it('returns anonymous on 401', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new (await import('./api-client')).ApiError(401, 'Nope'));

      const result = await login('a@b.com', 'pw');
      expect(result.state).toBe('anonymous');
    });

    it('throws on 500', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new (await import('./api-client')).ApiError(500, 'Oops'));
      await expect(login('a@b.com', 'pw')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('clears session even if api call fails', async () => {
      setGlobalSession({ state: 'authenticated' });
      vi.mocked(apiFetch).mockRejectedValue(new Error('network'));

      await expect(logout()).rejects.toThrow('network');
      expect(getGlobalSession().state).toBe('anonymous');
    });
  });
});
