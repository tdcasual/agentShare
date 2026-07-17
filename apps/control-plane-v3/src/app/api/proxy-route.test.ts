import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './[...path]/route';

describe('API route proxy headers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the bootstrap credential without forwarding unrelated headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'admin-1' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/admin/bootstrap/init', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bootstrap-token': 'bootstrap-token',
        'x-untrusted-header': 'must-not-leak',
      },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password' }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['admin', 'bootstrap', 'init'] }),
    });

    expect(response.status).toBe(201);
    const forwardedHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(forwardedHeaders.get('x-bootstrap-token')).toBe('bootstrap-token');
    expect(forwardedHeaders.get('x-untrusted-header')).toBeNull();
  });

  it('returns the shared detail contract when the backend is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    const request = new NextRequest('http://localhost/api/admin/session');

    const response = await GET(request, {
      params: Promise.resolve({ path: ['admin', 'session'] }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      detail: 'Backend service unavailable',
      code: 'backend_unavailable',
    });
  });

  it('returns 504 for an upstream timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'))
    );
    const request = new NextRequest('http://localhost/api/admin/session');

    const response = await GET(request, {
      params: Promise.resolve({ path: ['admin', 'session'] }),
    });

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      detail: 'Backend request timed out',
      code: 'backend_timeout',
    });
  });
});
