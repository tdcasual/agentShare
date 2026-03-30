import { apiFetch } from '@/lib/api-client';
import type {
  CapabilityCreateInput,
  GovernedCapability,
  GovernedSecret,
  SecretCreateInput,
} from './types';

export function getSecrets() {
  return apiFetch<{ items: GovernedSecret[] }>('/api/secrets');
}

export function createSecret(payload: SecretCreateInput) {
  return apiFetch<GovernedSecret>('/api/secrets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCapabilities() {
  return apiFetch<{ items: GovernedCapability[] }>('/api/capabilities');
}

export function createCapability(payload: CapabilityCreateInput) {
  return apiFetch<GovernedCapability>('/api/capabilities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const governanceApi = {
  getSecrets,
  createSecret,
  getCapabilities,
  createCapability,
};
