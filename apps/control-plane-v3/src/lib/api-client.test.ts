import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, ApiError } from './api-client';

describe('api-client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ id: '1', name: 'Alice' }),
    } as Response);

    const result = await apiFetch<{ id: string; name: string }>('/agents');
    expect(result).toEqual({ id: '1', name: 'Alice' });
  });

  it('throws ApiError with detail on 4xx response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ detail: 'Invalid input' }),
    } as Response);

    await expect(apiFetch('/agents')).rejects.toThrow(ApiError);
    await expect(apiFetch('/agents')).rejects.toMatchObject({
      status: 400,
      detail: 'Invalid input',
    });
  });

  it('throws ApiError with statusText when response body has no detail', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => '',
    } as Response);

    await expect(apiFetch('/agents')).rejects.toThrow(ApiError);
    await expect(apiFetch('/agents')).rejects.toMatchObject({
      status: 500,
      detail: 'Internal Server Error',
    });
  });

  it('parses empty response as null', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      text: async () => '',
    } as Response);

    const result = await apiFetch<unknown>('/logout');
    expect(result).toBeNull();
  });

  it('sets Content-Type when body is present', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{}',
    } as Response);

    await apiFetch('/session/login', { method: 'POST', body: JSON.stringify({ email: 'a' }) });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init as RequestInit).headers).toBeInstanceOf(Headers);
    expect(((init as RequestInit).headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('aborts request on timeout and throws localized ApiError', async () => {
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
        })
    );

    const promise = apiFetch('/slow', { timeout: 1 });

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 0,
      detail: '请求超时，请检查网络连接',
    });
  });

  it('aborts when external signal is triggered', async () => {
    const externalController = new AbortController();
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
        })
    );

    const promise = apiFetch('/agents', { signal: externalController.signal });
    externalController.abort();

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 0,
      detail: '请求超时，请检查网络连接',
    });
  });
});
