import { beforeEach, describe, expect, it, vi } from 'vitest';

const swrMock = vi.fn();

vi.mock('swr', () => ({
  default: (...args: unknown[]) => swrMock(...args),
  mutate: vi.fn(),
}));

vi.mock('@/lib/swr-config', () => ({
  staticConfig: {},
}));

vi.mock('./api', () => ({
  listSpaces: vi.fn(async () => ({ items: [] })),
}));

describe('space hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrMock.mockReturnValue({
      data: { items: [] },
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    });
  });

  it('requests spaces with focused agent filter in the swr key', async () => {
    const { useSpaces } = await import('./hooks');

    useSpaces({ agentId: 'test-agent' });

    expect(swrMock).toHaveBeenCalledWith(
      '/api/spaces?agent_id=test-agent',
      expect.any(Function),
      expect.any(Object)
    );
  });
});
