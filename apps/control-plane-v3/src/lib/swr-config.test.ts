import { describe, it, expect } from 'vitest';
import { swrConfig, pollingConfig, staticConfig } from './swr-config';
import { ApiError } from './api';

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
});
