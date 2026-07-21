import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as getHealthz } from './healthz/route';
import { GET as getReadyz } from './readyz/route';

describe('health routes passthrough', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards a healthy upstream /healthz response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await getHealthz();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/healthz$/);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('forwards a healthy upstream /readyz response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', database: 'ok', encryption: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await getReadyz();

    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/readyz$/);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      database: 'ok',
      encryption: 'ok',
    });
  });

  it('passes through a degraded upstream /readyz status code and body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'degraded', database: 'unavailable' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await getReadyz();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      status: 'degraded',
      database: 'unavailable',
    });
  });

  it('returns 503 with the error contract when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    const healthz = await getHealthz();
    const readyz = await getReadyz();

    for (const response of [healthz, readyz]) {
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      await expect(response.json()).resolves.toEqual({ status: 'error' });
    }
  });
});
