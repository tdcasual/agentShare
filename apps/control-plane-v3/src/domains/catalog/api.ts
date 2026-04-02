import { apiFetch } from '@/lib/api-client';
import type { CatalogItem, CatalogReleaseHistory } from './types';

type CatalogQuery = {
  resourceKind?: string;
  releaseStatus?: string;
};

function toCatalogPath(query?: CatalogQuery) {
  const searchParams = new URLSearchParams();

  if (query?.resourceKind) {
    searchParams.set('resource_kind', query.resourceKind);
  }
  if (query?.releaseStatus) {
    searchParams.set('release_status', query.releaseStatus);
  }

  const serialized = searchParams.toString();
  return serialized ? `/catalog?${serialized}` : '/catalog';
}

export function getCatalog(query?: CatalogQuery) {
  return apiFetch<{ items: CatalogItem[] }>(toCatalogPath(query));
}

export function getCatalogReleaseHistory(resourceKind: string, resourceId: string) {
  return apiFetch<CatalogReleaseHistory>(`/catalog/${resourceKind}/${resourceId}`);
}

export const catalogApi = {
  getCatalog,
  getCatalogReleaseHistory,
};
