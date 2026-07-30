'use client';

import useSWR, { mutate } from 'swr';
import {
  createSpace as apiCreateSpace,
  deleteSpace as apiDeleteSpace,
  getSpaceMemberships,
  listAllAgentTokens,
  listSpaces,
  replaceSpaceMemberships,
  updateSpace as apiUpdateSpace,
  type SpaceMembership,
  type VaultSpace,
} from '@/lib/vaultgate-api';

const SPACES_KEY = '/api/admin/spaces';
const TOKENS_KEY = '/api/admin/tokens';

export function useSpaces() {
  const state = useSWR(SPACES_KEY, listSpaces);
  return { spaces: state.data?.items ?? [], ...state, refresh: state.mutate };
}

export function useSpaceMemberships(spaceId: string | null) {
  const key = spaceId ? `${SPACES_KEY}/${spaceId}/memberships` : null;
  const state = useSWR(key, () => getSpaceMemberships(spaceId!));
  return { members: state.data?.members ?? [], ...state, refresh: state.mutate };
}

export function useAllAgentTokens() {
  const state = useSWR(TOKENS_KEY, () => listAllAgentTokens({ limit: 200, offset: 0 }));
  return {
    tokens: state.data?.items ?? [],
    total: state.data?.total ?? 0,
    ...state,
  };
}

export async function createSpace(input: { name: string; description?: string }) {
  const result = await apiCreateSpace(input);
  await mutate(SPACES_KEY);
  return result;
}

export async function updateSpace(
  id: string,
  input: Partial<Pick<VaultSpace, 'name' | 'description' | 'status'>>
) {
  const result = await apiUpdateSpace(id, input);
  await mutate(SPACES_KEY);
  return result;
}

export async function removeSpace(id: string) {
  await apiDeleteSpace(id);
  await mutate(SPACES_KEY);
}

export async function saveSpaceMemberships(id: string, members: SpaceMembership[]) {
  const result = await replaceSpaceMemberships(id, members);
  await mutate(`${SPACES_KEY}/${id}/memberships`);
  return result;
}
