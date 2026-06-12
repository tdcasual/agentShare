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

import { useTokens, useScopes, revokeToken, createToken, addScopes, removeScope } from './token';

describe('token domain', () => {
  describe('exports', () => {
    it('exports useTokens hook', () => {
      expect(typeof useTokens).toBe('function');
    });

    it('exports useScopes hook', () => {
      expect(typeof useScopes).toBe('function');
    });

    it('exports revokeToken function', () => {
      expect(typeof revokeToken).toBe('function');
    });

    it('exports createToken function', () => {
      expect(typeof createToken).toBe('function');
    });

    it('exports addScopes function', () => {
      expect(typeof addScopes).toBe('function');
    });

    it('exports removeScope function', () => {
      expect(typeof removeScope).toBe('function');
    });
  });
});
