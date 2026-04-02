'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';

import { staticConfig } from '@/lib/swr-config';

import * as api from './api';
import type { CatalogItem, CatalogReleaseHistory } from './types';

type CatalogQuery = {
  resourceKind?: string;
  releaseStatus?: string;
};

function getCatalogKey(query?: CatalogQuery) {
  const searchParams = new URLSearchParams();

  if (query?.resourceKind) {
    searchParams.set('resource_kind', query.resourceKind);
  }
  if (query?.releaseStatus) {
    searchParams.set('release_status', query.releaseStatus);
  }

  const serialized = searchParams.toString();
  return serialized ? `/api/catalog?${serialized}` : '/api/catalog';
}

export function useCatalog(query?: CatalogQuery, options?: SWRConfiguration) {
  const key = getCatalogKey(query);
  return useSWR<{ items: CatalogItem[] }>(
    key,
    () => api.getCatalog(query),
    {
      ...staticConfig,
      ...options,
    },
  );
}

export function useCatalogReleaseHistory(
  resourceKind?: string,
  resourceId?: string,
  options?: SWRConfiguration,
) {
  const key = resourceKind && resourceId
    ? `/api/catalog/${resourceKind}/${resourceId}`
    : null;

  return useSWR<CatalogReleaseHistory>(
    key,
    () => api.getCatalogReleaseHistory(resourceKind!, resourceId!),
    {
      ...staticConfig,
      ...options,
    },
  );
}

export function refreshCatalog(query?: CatalogQuery) {
  return mutate(getCatalogKey(query));
}
