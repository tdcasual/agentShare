import { describe, it, expect, vi } from 'vitest';
import { swrConfig, fetcher, fetcherWithParams, pollingConfig, staticConfig } from './swr-config';
import { api, ApiError } from './api';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      getAgents: vi.fn(),
      getTasks: vi.fn(),
      getRuns: vi.fn(),
      getAgentTokens: vi.fn(),
      getTokenFeedback: vi.fn(),
    },
  };
});

describe('swr-config', () => {
  it('exports expected config objects', () => {
    expect(swrConfig.revalidateOnFocus).toBe(false);
    expect(swrConfig.revalidateOnReconnect).toBe(true);
    expect(swrConfig.refreshInterval).toBe(0);
    expect(swrConfig.dedupingInterval).toBe(2000);
    expect(swrConfig.errorRetryCount).toBe(3);

    expect(pollingConfig.refreshInterval).toBe(5000);
    expect(pollingConfig.revalidateOnFocus).toBe(true);

    expect(staticConfig.revalidateOnFocus).toBe(false);
    expect(staticConfig.revalidateOnReconnect).toBe(false);
    expect(staticConfig.dedupingInterval).toBe(60000);
  });

  describe('shouldRetryOnError', () => {
    const shouldRetry = swrConfig.shouldRetryOnError as (err: unknown) => boolean;

    it('retries on 5xx ApiError', () => {
      expect(shouldRetry(new ApiError(500, 'down'))).toBe(true);
      expect(shouldRetry(new ApiError(503, 'down'))).toBe(true);
    });

    it('retries on status 0 (network error)', () => {
      expect(shouldRetry(new ApiError(0, 'offline'))).toBe(true);
    });

    it('does not retry on 4xx ApiError', () => {
      expect(shouldRetry(new ApiError(400, 'bad'))).toBe(false);
      expect(shouldRetry(new ApiError(404, 'missing'))).toBe(false);
    });

    it('retries on generic errors', () => {
      expect(shouldRetry(new Error('random'))).toBe(true);
    });
  });

  describe('fetcher', () => {
    it('calls getAgents for /api/agents', async () => {
      vi.mocked(api.getAgents).mockResolvedValue({ items: [] });
      const result = await fetcher('/api/agents');
      expect(api.getAgents).toHaveBeenCalled();
      expect(result).toEqual({ items: [] });
    });

    it('calls getTasks for /api/tasks', async () => {
      vi.mocked(api.getTasks).mockResolvedValue({ items: [] });
      await fetcher('/api/tasks');
      expect(api.getTasks).toHaveBeenCalled();
    });

    it('calls getRuns for /api/runs', async () => {
      vi.mocked(api.getRuns).mockResolvedValue({ items: [] });
      await fetcher('/api/runs');
      expect(api.getRuns).toHaveBeenCalled();
    });

    it('throws on unknown endpoint', async () => {
      await expect(fetcher('/api/unknown')).rejects.toThrow('Unknown API endpoint');
    });
  });

  describe('fetcherWithParams', () => {
    it('calls getAgentTokens for /api/agent-tokens', async () => {
      vi.mocked(api.getAgentTokens).mockResolvedValue({ items: [] });
      const result = await fetcherWithParams('/api/agent-tokens', { agentId: 'a1' });
      expect(api.getAgentTokens).toHaveBeenCalledWith('a1');
      expect(result).toEqual({ items: [] });
    });

    it('calls getTokenFeedback for /api/token-feedback', async () => {
      vi.mocked(api.getTokenFeedback).mockResolvedValue({ items: [] });
      const result = await fetcherWithParams('/api/token-feedback', { tokenId: 't1' });
      expect(api.getTokenFeedback).toHaveBeenCalledWith('t1');
      expect(result).toEqual({ items: [] });
    });

    it('throws on unknown endpoint', async () => {
      await expect(fetcherWithParams('/api/unknown', {})).rejects.toThrow('Unknown API endpoint');
    });
  });
});
