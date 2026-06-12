import { describe, expect, it, vi } from 'vitest';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined, isLoading: true, mutate: vi.fn() })),
  mutate: vi.fn(),
}));

// Mock the API module
vi.mock('@/lib/vaultgate-api', () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.status = status;
      this.detail = detail;
      this.name = 'ApiError';
    }
  },
}));

import { useSecrets, deleteSecret, createSecret, updateSecret } from './secret';

describe('secret domain', () => {
  describe('exports', () => {
    it('exports useSecrets hook', () => {
      expect(typeof useSecrets).toBe('function');
    });

    it('exports deleteSecret function', () => {
      expect(typeof deleteSecret).toBe('function');
    });

    it('exports createSecret function', () => {
      expect(typeof createSecret).toBe('function');
    });

    it('exports updateSecret function', () => {
      expect(typeof updateSecret).toBe('function');
    });
  });
});
