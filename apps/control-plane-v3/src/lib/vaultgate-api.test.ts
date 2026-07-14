import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getBootstrapStatus,
  listAgents,
  login,
  replaceTokenGrants,
} from './vaultgate-api';

describe('vaultgate-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('ApiError', () => {
    it('creates error with status and detail', () => {
      const error = new ApiError(401, 'Unauthorized');
      expect(error.status).toBe(401);
      expect(error.detail).toBe('Unauthorized');
      expect(error.message).toBe('Unauthorized');
      expect(error.name).toBe('ApiError');
    });

    it('can be caught as Error', () => {
      const error = new ApiError(500, 'Server Error');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiError).toBe(true);
    });
  });

  it('uses the exact new admin API contract on the same origin', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ setup_required: true }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'authenticated' }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ secret_ids: ['secret-1'] }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);

    await getBootstrapStatus();
    await login({ email: 'admin@example.com', password: 'password' });
    await listAgents();
    await replaceTokenGrants('token-1', ['secret-1']);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/bootstrap/status',
      '/api/admin/session/login',
      '/api/admin/agents',
      '/api/admin/tokens/token-1/grants',
    ]);
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: 'PUT' });
  });
});
