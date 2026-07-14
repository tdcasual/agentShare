import { describe, expect, it, vi } from 'vitest';

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, error: undefined, isLoading: true, mutate: vi.fn() })),
  mutate: vi.fn(),
}));

// Mock the API module
vi.mock('@/lib/vaultgate-api', () => ({
  listAuditLogs: vi.fn(),
  getAuditStats: vi.fn(),
}));

import { useAuditLogs, useAuditStats } from './audit';

describe('audit domain', () => {
  describe('exports', () => {
    it('exports useAuditLogs hook', () => {
      expect(typeof useAuditLogs).toBe('function');
    });

    it('exports useAuditStats hook', () => {
      expect(typeof useAuditStats).toBe('function');
    });
  });
});
