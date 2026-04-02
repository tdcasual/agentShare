import { apiFetch } from '@/lib/api-client';
import type { CatalogItem } from './types';

export function getCatalog() {
  return apiFetch<{ items: CatalogItem[] }>('/catalog');
}

export const catalogApi = {
  getCatalog,
};
