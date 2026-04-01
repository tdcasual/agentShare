import { apiFetch } from '@/lib/api-client';
import type { GroupedSearchResults } from './types';

export const SEARCH_ROUTE = '/search';

export function searchControlPlane(query: string) {
  const searchParams = new URLSearchParams({ q: query });
  return apiFetch<GroupedSearchResults>(`${SEARCH_ROUTE}?${searchParams.toString()}`);
}

export const searchApi = {
  searchControlPlane,
};
