/**
 * VaultGate Token Domain
 *
 * Provides SWR hooks for token and scope management.
 */

'use client';

import useSWR, { mutate } from 'swr';
import {
  listTokens as apiListTokens,
  createToken as apiCreateToken,
  revokeToken as apiRevokeToken,
  listScopes as apiListScopes,
  createScopes as apiCreateScopes,
  deleteScope as apiDeleteScope,
  type TokenCreateInput,
  type TokenCreateResponse,
  type Scope,
  type ScopeCreateInput,
} from '@/lib/vaultgate-api';

// Cache key prefixes
const TOKEN_CACHE_KEY = '/api/tokens';
const SCOPE_CACHE_KEY = (tokenId: string) => `/api/tokens/${tokenId}/scopes`;

// ============================================
// Token Hooks
// ============================================

export function useTokens() {
  const { data, error, isLoading, mutate } = useSWR(
    TOKEN_CACHE_KEY,
    () => apiListTokens().then((res) => res.items)
  );

  return {
    tokens: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// Scope Hooks
// ============================================

export function useScopes(tokenId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    tokenId ? SCOPE_CACHE_KEY(tokenId) : null,
    () =>
      tokenId
        ? apiListScopes(tokenId).then((res) => res.items)
        : Promise.reject(new Error('No token ID provided'))
  );

  return {
    scopes: data ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// Token Mutations
// ============================================

export async function createToken(input: TokenCreateInput): Promise<TokenCreateResponse> {
  const response = await apiCreateToken(input);
  // Refresh the list
  mutate(TOKEN_CACHE_KEY);
  return response;
}

export async function revokeToken(id: string): Promise<void> {
  await apiRevokeToken(id);
  // Refresh the list and specific item
  mutate(TOKEN_CACHE_KEY);
  mutate(`${TOKEN_CACHE_KEY}/${id}`);
}

// ============================================
// Scope Mutations
// ============================================

export async function addScopes(tokenId: string, input: ScopeCreateInput): Promise<Scope[]> {
  const response = await apiCreateScopes(tokenId, input);
  // Refresh the scopes list
  mutate(SCOPE_CACHE_KEY(tokenId));
  return response.items;
}

export async function removeScope(tokenId: string, secretId: string): Promise<void> {
  await apiDeleteScope(tokenId, secretId);
  // Refresh the scopes list
  mutate(SCOPE_CACHE_KEY(tokenId));
}
