'use client';

import useSWR, { mutate, SWRConfiguration } from 'swr';

import { swrConfig } from '@/lib/swr-config';

import * as api from './api';
import type {
  CapabilityCreateInput,
  GovernedCapability,
  GovernedSecret,
  SecretCreateInput,
} from './types';

export function useSecrets(options?: SWRConfiguration) {
  return useSWR<{ items: GovernedSecret[] }>(
    options?.isPaused ? null : '/api/secrets',
    () => api.getSecrets(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCapabilities(options?: SWRConfiguration) {
  return useSWR<{ items: GovernedCapability[] }>(
    options?.isPaused ? null : '/api/capabilities',
    () => api.getCapabilities(),
    {
      ...swrConfig,
      ...options,
    }
  );
}

export function useCreateSecret() {
  return async (payload: SecretCreateInput) => {
    const result = await api.createSecret(payload);
    await mutate('/api/secrets');
    return result;
  };
}

export function useCreateCapability() {
  return async (payload: CapabilityCreateInput) => {
    const result = await api.createCapability(payload);
    await Promise.all([mutate('/api/capabilities'), mutate('/api/secrets')]);
    return result;
  };
}

export function refreshGovernance() {
  return Promise.all([mutate('/api/secrets'), mutate('/api/capabilities')]);
}
