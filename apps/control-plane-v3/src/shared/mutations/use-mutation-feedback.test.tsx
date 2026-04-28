import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { useMutationFeedback } from './use-mutation-feedback';

describe('useMutationFeedback', () => {
  it('preserves ApiError details and clears previous errors before retrying', async () => {
    const { result } = renderHook(() => useMutationFeedback());

    await act(async () => {
      await result.current
        .runMutation(() => Promise.reject(new ApiError(503, 'Secret backend unavailable')), {
          fallbackError: 'Create failed',
          success: 'Created',
        })
        .catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Secret backend unavailable');
    });
    expect(result.current.success).toBeNull();

    await act(() =>
      result.current.runMutation(() => Promise.resolve('ok'), {
        fallbackError: 'Create failed',
        success: 'Created',
      })
    );

    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe('Created');
  });

  it('uses fallback copy for unknown failures', async () => {
    const { result } = renderHook(() => useMutationFeedback());

    await act(async () => {
      await result.current
        .runMutation(() => Promise.reject('nope'), {
          fallbackError: 'Publish failed',
        })
        .catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Publish failed');
    });
  });
});
