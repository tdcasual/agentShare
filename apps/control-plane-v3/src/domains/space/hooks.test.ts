import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const swrMock = vi.fn();
const mutateMock = vi.fn();
const useSWRConfigMock = vi.fn();
const addSpaceMemberMock = vi.fn();

vi.mock('swr', () => ({
  default: (...args: unknown[]) => swrMock(...args),
  mutate: mutateMock,
  useSWRConfig: () => useSWRConfigMock(),
}));

vi.mock('@/lib/swr-config', () => ({
  staticConfig: {},
}));

vi.mock('./api', () => ({
  listSpaces: vi.fn(async () => ({ items: [] })),
  addSpaceMember: (...args: unknown[]) => addSpaceMemberMock(...args),
}));

describe('space hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateMock.mockResolvedValue(undefined);
    useSWRConfigMock.mockReturnValue({
      mutate: mutateMock,
    });
    addSpaceMemberMock.mockResolvedValue({ id: 'member-1' });
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

  it('refreshes both unfiltered and focused spaces lists after adding a member', async () => {
    const { useAddSpaceMember } = await import('./hooks');

    const { result } = renderHook(() => useAddSpaceMember('space-1', { agentId: 'test-agent' }));

    await result.current.addMember({
      memberType: 'agent',
      memberId: 'agent-1',
      role: 'viewer',
    });

    expect(mutateMock).toHaveBeenCalledWith('/spaces/space-1');
    expect(mutateMock).toHaveBeenCalledWith('/spaces');
    expect(mutateMock).toHaveBeenCalledWith('/api/spaces?agent_id=test-agent');
  });
});
