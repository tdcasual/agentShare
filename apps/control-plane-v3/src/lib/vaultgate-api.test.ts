import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  getBootstrapStatus,
  listAgents,
  login,
  replaceTokenGrants,
  bootstrap,
  listSecrets,
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
        new Response(JSON.stringify({ setup_required: true, bootstrap_token_required: true }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'admin-1' }), { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'authenticated' }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ secret_ids: ['secret-1'] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [], total: 73 }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);

    await getBootstrapStatus();
    await bootstrap(
      { email: 'admin@example.com', password: 'password' },
      'bootstrap-token-with-at-least-32-bytes'
    );
    await login({ email: 'admin@example.com', password: 'password' });
    await listAgents();
    await replaceTokenGrants('token-1', ['secret-1']);
    await listSecrets({ limit: 25, offset: 50 });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/bootstrap/status',
      '/api/admin/bootstrap/init',
      '/api/admin/session/login',
      '/api/admin/agents',
      '/api/admin/tokens/token-1/grants',
      '/api/admin/secrets?limit=25&offset=50',
    ]);
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('x-bootstrap-token')).toBe(
      'bootstrap-token-with-at-least-32-bytes'
    );
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({ method: 'PUT' });
  });

  it('normalizes non-JSON API failures into ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('upstream unavailable', { status: 502 }))
    );

    await expect(getBootstrapStatus()).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      detail: 'upstream unavailable',
    });
  });
});
