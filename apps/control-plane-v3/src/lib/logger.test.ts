import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStoredLogs, getStoredLogs, logger } from './logger';

describe('logger', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearStoredLogs();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('persists browser error entries with a correlation id and path context', () => {
    window.history.replaceState({}, '', '/assets?tab=secrets');

    logger.error.error('Capability publish failed', new Error('backend unavailable'));

    const entries = getStoredLogs();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      namespace: 'Error',
      level: 'error',
      message: 'Capability publish failed',
      path: '/assets?tab=secrets',
    });
    expect(entries[0].correlationId).toMatch(/^cp-/);
  });
});
