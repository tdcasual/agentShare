import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './[...path]/route';

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
});
