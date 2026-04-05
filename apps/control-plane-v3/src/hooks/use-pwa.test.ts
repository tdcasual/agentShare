import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shareContent, vibrateFeedback } from './use-pwa';

describe('shareContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error when Web Share API is not supported', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    await expect(shareContent({ title: 'Test', text: 'Test' })).rejects.toThrow(
      'Web Share API not supported'
    );
  });

  it('should share content when API is available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global, 'navigator', {
      value: { share: shareMock },
      writable: true,
      configurable: true,
    });

    await shareContent({ title: 'Test', text: 'Test', url: 'https://example.com' });
    expect(shareMock).toHaveBeenCalledWith({
      title: 'Test',
      text: 'Test',
      url: 'https://example.com',
    });
  });

  it('should not throw on share abort', async () => {
    const shareMock = vi.fn().mockRejectedValue({ name: 'AbortError' });
    Object.defineProperty(global, 'navigator', {
      value: { share: shareMock },
      writable: true,
      configurable: true,
    });

    await expect(shareContent({ title: 'Test', text: 'Test' })).resolves.toBeUndefined();
  });
});

describe('vibrateFeedback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should call vibrate when supported', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      writable: true,
      configurable: true,
    });

    vibrateFeedback([100, 50, 100]);
    expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('should use default pattern when not specified', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      writable: true,
      configurable: true,
    });

    vibrateFeedback();
    expect(vibrateMock).toHaveBeenCalledWith(50);
  });

  it('should not throw when vibrate is not supported', () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    expect(() => vibrateFeedback(100)).not.toThrow();
  });
});
