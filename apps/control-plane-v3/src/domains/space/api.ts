import { apiFetch } from '@/lib/api-client';
import type { SpaceListResponse } from './types';

export function listSpaces(options?: { agentId?: string | null }) {
  const params = new URLSearchParams();
  if (options?.agentId) {
    params.set('agent_id', options.agentId);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return apiFetch<SpaceListResponse>(`/spaces${suffix}`);
}

export const spaceApi = {
  listSpaces,
};
