/**
 * VaultGate Secret Domain
 *
 * Provides SWR hooks for secret CRUD operations.
 */

'use client';

import useSWR, { mutate } from 'swr';
import {
  buildApiPath,
  listSecrets as apiListSecrets,
  createSecret as apiCreateSecret,
  updateSecret as apiUpdateSecret,
  revealSecret as apiRevealSecret,
  deleteSecret as apiDeleteSecret,
  type Secret,
  type SecretCreateInput,
  type SecretUpdateInput,
  type SecretQuery,
} from '@/lib/vaultgate-api';

// Cache key prefix
const SECRET_CACHE_KEY = '/api/admin/secrets';

// ============================================
// Hooks
// ============================================

export function useSecrets(query: SecretQuery = {}) {
  const key = buildApiPath(SECRET_CACHE_KEY, query);
  const { data, error, isLoading, mutate } = useSWR(key, () => apiListSecrets(query));

  return {
    secrets: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// Mutations
// ============================================

export async function createSecret(input: SecretCreateInput): Promise<Secret> {
  const secret = await apiCreateSecret(input);
  // Refresh the list
  mutate((key) => typeof key === 'string' && key.startsWith(SECRET_CACHE_KEY));
  return secret;
}

export async function updateSecret(id: string, input: SecretUpdateInput): Promise<Secret> {
  const secret = await apiUpdateSecret(id, input);
  // All secret reads use paginated list keys.
  mutate((key) => typeof key === 'string' && key.startsWith(SECRET_CACHE_KEY));
  return secret;
}

export async function revealSecret(id: string): Promise<string> {
  const revealed = await apiRevealSecret(id);
  return revealed.value;
}

export async function deleteSecret(id: string): Promise<void> {
  await apiDeleteSecret(id);
  // Refresh the list
  mutate((key) => typeof key === 'string' && key.startsWith(SECRET_CACHE_KEY));
}
