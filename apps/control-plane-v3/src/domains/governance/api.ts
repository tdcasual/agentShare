import { apiFetch, apiFetchWithMeta } from '@/lib/api-client';
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
  return apiFetchWithMeta<GovernedSecret>('/secrets', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(({ data, status }) => ({ ...data, response_status: status }));
}

export function getCapabilities() {
  return apiFetch<{ items: GovernedCapability[] }>('/capabilities');
}

export function createCapability(payload: CapabilityCreateInput) {
  return apiFetchWithMeta<GovernedCapability>('/capabilities', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(({ data, status }) => ({ ...data, response_status: status }));
}

export const governanceApi = {
  getSecrets,
  createSecret,
  getCapabilities,
  createCapability,
};
