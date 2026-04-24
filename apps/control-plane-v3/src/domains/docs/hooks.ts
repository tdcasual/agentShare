/**
 * Docs Domain Hooks
 *
 * SWR-based data fetching for public docs
 */

'use client';

import useSWR, { mutate, SWRConfiguration } from 'swr';
import { staticConfig } from '@/lib/swr-config';
import { listPublicDocs, getPublicDoc } from './api';
import type { PublicDocDetail } from './types';

const PUBLIC_DOCS_KEY = '/api/public/docs';

export function usePublicDocs(options?: SWRConfiguration) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    options?.isPaused ? null : PUBLIC_DOCS_KEY,
    () => listPublicDocs(),
    {
      ...staticConfig,
      ...options,
    }
  );

  return {
    docs: data?.items ?? [],
    isLoading,
    error,
    refresh,
  };
}

export function usePublicDoc(category: string | null, filename: string | null, options?: SWRConfiguration) {
  const key = category && filename ? `${PUBLIC_DOCS_KEY}/${category}/${filename}` : null;

  return useSWR<PublicDocDetail>(
    key,
    () => getPublicDoc(category!, filename!),
    {
      ...staticConfig,
      ...options,
    }
  );
}

export function refreshPublicDocs() {
  return mutate(PUBLIC_DOCS_KEY);
}
