import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from './vaultgate-api';

describe('vaultgate-api', () => {
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
});
