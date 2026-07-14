'use client';

import useSWR, { mutate } from 'swr';
import {
  createAgent as apiCreateAgent,
  getAgent,
  getTokenGrants,
  issueAgentToken,
  listAgents,
  replaceTokenGrants,
  revokeAgentToken,
  rotateAgentToken,
  updateAgent,
  type Agent,
  type PageQuery,
} from '@/lib/vaultgate-api';

const AGENTS_KEY = '/api/admin/agents';
const EMPTY_SECRET_IDS: string[] = [];

export function useAgents(query: PageQuery & { status?: Agent['status'] } = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(
    ([key, value]) => value !== undefined && params.set(key, String(value))
  );
  const key = `${AGENTS_KEY}${params.size ? `?${params}` : ''}`;
  const state = useSWR(key, () => listAgents(query));
  return {
    agents: state.data?.items ?? [],
    total: state.data?.total ?? 0,
    ...state,
    refresh: state.mutate,
  };
}

export function useAgent(id: string | null) {
  const state = useSWR(id ? `${AGENTS_KEY}/${id}` : null, () => getAgent(id!));
  return { agent: state.data, ...state, refresh: state.mutate };
}

export function useTokenGrants(tokenId: string | null) {
  const key = tokenId ? `/api/admin/tokens/${tokenId}/grants` : null;
  const state = useSWR(key, () => getTokenGrants(tokenId!));
  return { secretIds: state.data?.secret_ids ?? EMPTY_SECRET_IDS, ...state };
}

export async function createAgent(input: { name: string; description?: string }) {
  const agent = await apiCreateAgent(input);
  await mutate((key) => typeof key === 'string' && key.startsWith(AGENTS_KEY));
  return agent;
}

export async function setAgentStatus(id: string, status: 'active' | 'disabled') {
  const agent = await updateAgent(id, { status });
  await Promise.all([
    mutate((key) => typeof key === 'string' && key.startsWith(AGENTS_KEY)),
    mutate(`${AGENTS_KEY}/${id}`),
  ]);
  return agent;
}

export async function issueToken(agentId: string, input: { name: string; ttl_seconds?: number }) {
  const token = await issueAgentToken(agentId, input);
  await mutate(`${AGENTS_KEY}/${agentId}`);
  return token;
}

export async function rotateToken(agentId: string, tokenId: string) {
  const token = await rotateAgentToken(tokenId);
  await mutate(`${AGENTS_KEY}/${agentId}`);
  return token;
}

export async function revokeToken(agentId: string, tokenId: string) {
  await revokeAgentToken(tokenId);
  await mutate(`${AGENTS_KEY}/${agentId}`);
}

export async function saveGrants(tokenId: string, secretIds: string[]) {
  const grants = await replaceTokenGrants(tokenId, secretIds);
  await mutate(`/api/admin/tokens/${tokenId}/grants`);
  return grants;
}
