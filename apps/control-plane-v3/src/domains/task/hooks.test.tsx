import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { useCreateTask } from './hooks';
import * as api from './api';

const mutateMock = vi.hoisted(() => vi.fn());

vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: mutateMock,
  };
});

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    createTask: vi.fn(),
  };
});

describe('task hooks', () => {
  it('does not optimistically add a task when publishing fails', async () => {
    vi.mocked(api.createTask).mockRejectedValueOnce(new ApiError(500, 'Task backend unavailable'));
    mutateMock.mockClear();

    const { result } = renderHook(() => useCreateTask());

    await expect(
      result.current({
        title: 'Ship config sync',
        task_type: 'config_sync',
        priority: 'normal',
        input: {},
        target_mode: 'broadcast',
        target_access_token_ids: [],
      })
    ).rejects.toThrow('Task backend unavailable');

    await waitFor(() => {
      expect(api.createTask).toHaveBeenCalledTimes(1);
    });
    expect(mutateMock).not.toHaveBeenCalled();
  });
});
