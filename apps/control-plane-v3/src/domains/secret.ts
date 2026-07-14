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
  deleteSecret as apiDeleteSecret,
  type Secret,
  type SecretCreateInput,
  type SecretUpdateInput,
  type PageQuery,
} from '@/lib/vaultgate-api';

// Cache key prefix
const SECRET_CACHE_KEY = '/api/admin/secrets';

// ============================================
// Hooks
// ============================================

export function useSecrets(query: PageQuery = {}) {
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
  // Refresh the list and specific item
  mutate((key) => typeof key === 'string' && key.startsWith(SECRET_CACHE_KEY));
  mutate(`${SECRET_CACHE_KEY}/${id}`);
  return secret;
}

export async function deleteSecret(id: string): Promise<void> {
  await apiDeleteSecret(id);
  // Refresh the list
  mutate((key) => typeof key === 'string' && key.startsWith(SECRET_CACHE_KEY));
}
