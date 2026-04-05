import useSWR, { useSWRConfig } from 'swr';
import { useCallback, useState } from 'react';
import { listSpaces, createSpace, getSpace, addSpaceMember } from './api';
import type { 
  CreateSpaceInput, 
  CreateSpaceMemberInput
} from './types';
import { staticConfig } from '@/lib/swr-config';

/**
 * 获取空间列表
 */
export function useSpaces(options?: { agentId?: string | null }) {
  const key = options?.agentId 
    ? `/api/spaces?agent_id=${options.agentId}` 
    : '/spaces';
  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => listSpaces(options),
    staticConfig
  );

  return {
    spaces: data?.items || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 获取单个空间详情
 */
export function useSpace(spaceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    spaceId ? `/spaces/${spaceId}` : null,
    () => getSpace(spaceId!),
    staticConfig
  );

  return {
    space: data,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 创建空间
 */
export function useCreateSpace() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (input: CreateSpaceInput) => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createSpace(input);
      // 刷新列表
      await mutate('/spaces');
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('创建失败'));
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [mutate]);

  return {
    create,
    isCreating,
    error,
  };
}

/**
 * 添加成员到空间
 */
export function useAddSpaceMember(spaceId: string, options?: { agentId?: string | null }) {
  const { mutate } = useSWRConfig();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addMember = useCallback(async (input: CreateSpaceMemberInput) => {
    setIsAdding(true);
    setError(null);

    try {
      const result = await addSpaceMember(spaceId, input);
      // 刷新空间详情和列表
      await mutate(`/spaces/${spaceId}`);
      await mutate('/spaces');
      if (options?.agentId) {
        await mutate(`/api/spaces?agent_id=${options.agentId}`);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('添加成员失败'));
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [mutate, options?.agentId, spaceId]);

  return {
    addMember,
    isAdding,
    error,
  };
}
