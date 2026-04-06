/**
 * Playbook Hooks - 手册领域React Hooks
 */

'use client';

import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr';
import { useCallback, useMemo, useState } from 'react';
import { searchPlaybooks, getPlaybook, createPlaybook, type PlaybookSearchResponse } from './api';
import type {
  PlaybookTransportDTO,
  Playbook,
  PlaybookSearchQuery,
  CreatePlaybookInput,
} from './types';
import { staticConfig } from '@/lib/swr-config';

// 转换函数 - 与后端 PlaybookResponse 对齐
function toPlaybookModel(dto: PlaybookTransportDTO): Playbook {
  return {
    id: dto.id,
    title: dto.title,
    body: dto.body,
    taskType: dto.task_type,
    tags: dto.tags,
    publicationStatus: dto.publication_status,
  };
}

// SWR key生成
const getPlaybooksKey = (query?: PlaybookSearchQuery) => {
  if (!query) {
    return '/api/playbooks/search';
  }
  return ['/api/playbooks/search', query];
};

interface UsePlaybooksReturn {
  playbooks: Playbook[];
  total: number;
  appliedFilters?: PlaybookSearchResponse['meta']['applied_filters'];
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => Promise<PlaybookSearchResponse | undefined>;
}

/**
 * 搜索手册
 */
export function usePlaybooks(
  query?: PlaybookSearchQuery,
  config?: SWRConfiguration
): UsePlaybooksReturn {
  const { data, error, isLoading, mutate } = useSWR<PlaybookSearchResponse>(
    getPlaybooksKey(query),
    () => searchPlaybooks(query),
    {
      ...staticConfig,
      ...config,
    }
  );

  // 转换DTO到Model
  const playbooks = useMemo(() => {
    return (data?.items || []).map(toPlaybookModel);
  }, [data?.items]);

  return {
    playbooks,
    total: data?.meta?.total || 0,
    appliedFilters: data?.meta?.applied_filters,
    isLoading,
    error,
    refresh: mutate,
  };
}

/**
 * 获取单个手册
 */
export function usePlaybook(playbookId: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading } = useSWR<PlaybookTransportDTO>(
    playbookId ? `/api/playbooks/${playbookId}` : null,
    () => getPlaybook(playbookId!),
    {
      ...staticConfig,
      ...config,
    }
  );

  const playbook = useMemo(() => {
    return data ? toPlaybookModel(data) : null;
  }, [data]);

  return {
    playbook,
    isLoading,
    error,
  };
}

/**
 * 创建手册操作
 */
export function useCreatePlaybook() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(
    async (input: CreatePlaybookInput) => {
      setIsCreating(true);
      setError(null);

      try {
        const result = await createPlaybook(input);
        // 刷新列表缓存
        await mutate('/api/playbooks/search');
        return toPlaybookModel(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('创建失败'));
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [mutate]
  );

  return {
    create,
    isCreating,
    error,
  };
}
