import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers());

  it('publishes only the latest value after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 250), {
      initialProps: { value: '' },
    });

    rerender({ value: 'a' });
    rerender({ value: 'agent' });
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(250));
    expect(result.current).toBe('agent');
  });
});
