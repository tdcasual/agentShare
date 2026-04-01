'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { searchControlPlane } from './api';
import type { GroupedSearchResults } from './types';

const EMPTY_RESULTS: GroupedSearchResults = {
  identities: [],
  tasks: [],
  assets: [],
  skills: [],
  events: [],
};

export function useGlobalSearch(query: string, options?: SWRConfiguration) {
  const normalizedQuery = query.trim();
  const shouldSearch = normalizedQuery.length > 0;

  const { data, error, isLoading } = useSWR(
    shouldSearch ? ['/api/search', normalizedQuery] : null,
    ([, searchQuery]) => searchControlPlane(searchQuery),
    {
      ...swrConfig,
      revalidateOnFocus: false,
      keepPreviousData: true,
      ...options,
    }
  );

  return {
    results: data ?? EMPTY_RESULTS,
    isLoading,
    error,
    hasQuery: shouldSearch,
  };
}
