import { apiFetch } from '@/lib/api-client';
import type {
  CapabilityCreateInput,
  GovernedCapability,
  GovernedSecret,
  SecretCreateInput,
} from './types';

export function getSecrets() {
  return apiFetch<{ items: GovernedSecret[] }>('/secrets');
}

export function createSecret(payload: SecretCreateInput) {
  return apiFetch<GovernedSecret>('/secrets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCapabilities() {
  return apiFetch<{ items: GovernedCapability[] }>('/capabilities');
}

export function createCapability(payload: CapabilityCreateInput) {
  return apiFetch<GovernedCapability>('/capabilities', {
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
