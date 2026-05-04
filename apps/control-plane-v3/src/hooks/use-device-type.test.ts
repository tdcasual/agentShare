import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeviceType, useIsMobile, useIsTablet } from './use-device-type';

describe('useDeviceType', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    // 重置 window 尺寸
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    vi.clearAllMocks();
  });

  it('should detect mobile device when width < 768px', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 812,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.type).toBe('mobile');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect tablet portrait when width is 768px-1024px and portrait', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 820 });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1180,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.type).toBe('tablet-portrait');
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isTabletPortrait).toBe(true);
    expect(result.current.isTabletLandscape).toBe(false);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.orientation).toBe('portrait');
  });

  it('should detect tablet landscape when width is 768px-1024px and landscape', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.type).toBe('tablet-landscape');
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isTabletPortrait).toBe(false);
    expect(result.current.isTabletLandscape).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.orientation).toBe('landscape');
  });

  it('should detect desktop when width >= 1024px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.type).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(false);
  });

  it('should report correct viewport dimensions', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1080,
    });

    const { result } = renderHook(() => useDeviceType());

    expect(result.current.width).toBe(1920);
    expect(result.current.height).toBe(1080);
  });
});

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('should return true for mobile', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should return false for tablet', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 820 });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});

describe('useIsTablet', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('should return true for tablet portrait', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 820 });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1180,
    });

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(true);
  });

  it('should return true for tablet landscape', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(true);
  });

  it('should return false for mobile', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(false);
  });

  it('should return false for desktop', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });

    const { result } = renderHook(() => useIsTablet());

    expect(result.current).toBe(false);
  });
});
