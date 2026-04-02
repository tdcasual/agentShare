'use client';

import useSWR, { SWRConfiguration, mutate } from 'swr';

import { staticConfig } from '@/lib/swr-config';

import * as api from './api';
import type { CatalogItem } from './types';

export function useCatalog(options?: SWRConfiguration) {
  return useSWR<{ items: CatalogItem[] }>(
    '/api/catalog',
    () => api.getCatalog(),
    {
      ...staticConfig,
      ...options,
    },
  );
}

export function refreshCatalog() {
  return mutate('/api/catalog');
}
