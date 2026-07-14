'use client';

import {
  ApiError,
  getBootstrapStatus,
  getCurrentSession,
  type AdminSession,
} from './vaultgate-api';

export type AppEntryState =
  | { kind: 'setup_required' }
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; session: AdminSession }
  | { kind: 'unavailable'; error: string };

export async function resolveAppEntryState(): Promise<AppEntryState> {
  try {
    const bootstrap = await getBootstrapStatus();
    if (bootstrap.setup_required) {
      return { kind: 'setup_required' };
    }
    try {
      return { kind: 'authenticated', session: await getCurrentSession() };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return { kind: 'anonymous' };
      }
      throw error;
    }
  } catch (error) {
    return { kind: 'unavailable', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
