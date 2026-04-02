'use client';

import useSWR, { mutate, type SWRConfiguration } from 'swr';
import { staticConfig } from '@/lib/swr-config';
import { listSpaces } from './api';
import type { SpaceListResponse } from './types';

function buildSpacesKey(agentId?: string | null) {
  return agentId ? `/api/spaces?agent_id=${agentId}` : '/api/spaces';
}

export function useSpaces(options?: { agentId?: string | null; swr?: SWRConfiguration }) {
  const key = buildSpacesKey(options?.agentId);
  return useSWR<SpaceListResponse>(
    key,
    () => listSpaces({ agentId: options?.agentId }),
    {
      ...staticConfig,
      ...options?.swr,
    }
  );
}

export function refreshSpaces(agentId?: string | null) {
  return mutate(buildSpacesKey(agentId));
}
