import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  changePassword,
  createManagementToken,
  getBootstrapStatus,
  getCurrentSession,
  listAgents,
  login,
  replaceTokenGrants,
  bootstrap,
  listSecrets,
  listManagementTokens,
  revokeManagementToken,
  rotateManagementToken,
} from './vaultgate-api';

describe('vaultgate-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it('uses the management token lifecycle endpoints and no-store requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'token-1', token: 'vgm_created' }), { status: 201 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'token-1', token: 'vgm_rotated' }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await listManagementTokens({ limit: 25, offset: 0 });
    await createManagementToken({ name: 'deploy', ttl_seconds: 3600 });
    await rotateManagementToken('token-1');
    await revokeManagementToken('token-1');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/admin/management-tokens?limit=25&offset=0',
      '/api/admin/management-tokens',
      '/api/admin/management-tokens/token-1/rotate',
      '/api/admin/management-tokens/token-1',
    ]);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('cache-control')).toBe(
      'no-store'
    );
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('uses the password change endpoint and exact request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await changePassword({
      current_password: 'Curr3nt!Password2026',
      new_password: 'N3w!Password#2026',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/password',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({
          current_password: 'Curr3nt!Password2026',
          new_password: 'N3w!Password#2026',
        }),
      })
    );
  });

  it('extracts FastAPI validation messages from structured errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: [
              { loc: ['body', 'name'], msg: 'Field required', type: 'missing' },
              { loc: ['body', 'value'], msg: 'Value is too long', type: 'value_error' },
            ],
          }),
          { status: 422, statusText: 'Unprocessable Content' }
        )
      )
    );

    await expect(getBootstrapStatus()).rejects.toMatchObject({
      status: 422,
      detail: 'Field required; Value is too long',
    });
  });

  describe('session expiry redirect', () => {
    function mockUnauthorized() {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Authentication required' }), { status: 401 })
          )
      );
    }

    // jsdom forbids spying on window.location directly, so stub a minimal window
    // exposing just what requestJson touches.
    function stubWindowLocation(pathname: string) {
      const replaceMock = vi.fn();
      vi.stubGlobal('window', {
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
        location: { pathname, replace: replaceMock },
      });
      return replaceMock;
    }

    it('redirects to /login when a non-session request returns 401', async () => {
      mockUnauthorized();
      const replaceMock = stubWindowLocation('/secrets');

      await expect(listSecrets()).rejects.toMatchObject({ status: 401 });
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });

    it('does not redirect for session endpoint 401s', async () => {
      mockUnauthorized();
      const replaceMock = stubWindowLocation('/secrets');

      await expect(getCurrentSession()).rejects.toMatchObject({ status: 401 });
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('does not redirect while already on the login or setup page', async () => {
      mockUnauthorized();
      const replaceMock = stubWindowLocation('/login');

      await expect(listSecrets()).rejects.toMatchObject({ status: 401 });
      expect(replaceMock).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
      mockUnauthorized();
      const setupReplaceMock = stubWindowLocation('/setup');

      await expect(listSecrets()).rejects.toMatchObject({ status: 401 });
      expect(setupReplaceMock).not.toHaveBeenCalled();
    });
  });
});
