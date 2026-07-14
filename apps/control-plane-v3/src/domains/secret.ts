/**
 * VaultGate Secret Domain
 *
 * Provides SWR hooks for secret CRUD operations.
 */

'use client';

import useSWR, { mutate } from 'swr';
import {
  listSecrets as apiListSecrets,
  createSecret as apiCreateSecret,
  updateSecret as apiUpdateSecret,
  deleteSecret as apiDeleteSecret,
  type Secret,
  type SecretCreateInput,
  type SecretUpdateInput,
} from '@/lib/vaultgate-api';

// Cache key prefix
const SECRET_CACHE_KEY = '/api/admin/secrets';

// ============================================
// Hooks
// ============================================

export function useSecrets() {
  const { data, error, isLoading, mutate } = useSWR(SECRET_CACHE_KEY, () =>
    apiListSecrets().then((res) => res.items)
  );

  return {
    secrets: data ?? [],
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
  mutate(SECRET_CACHE_KEY);
  return secret;
}

export async function updateSecret(id: string, input: SecretUpdateInput): Promise<Secret> {
  const secret = await apiUpdateSecret(id, input);
  // Refresh the list and specific item
  mutate(SECRET_CACHE_KEY);
  mutate(`${SECRET_CACHE_KEY}/${id}`);
  return secret;
}

export async function deleteSecret(id: string): Promise<void> {
  await apiDeleteSecret(id);
  // Refresh the list
  mutate(SECRET_CACHE_KEY);
}
