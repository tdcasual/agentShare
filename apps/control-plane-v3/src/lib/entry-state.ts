/**
 * Entry state resolution for VaultGate.
 *
 * Simplified from the Agent Control Plane version — VaultGate always requires
 * login (no separate bootstrap flow).
 */
'use client';

import type { BootstrapStatus, ManagementSessionSummary } from '@/shared/types';

export type EntryState =
  | { kind: 'login_required'; bootstrap: BootstrapStatus }
  | { kind: 'authenticated_ready'; bootstrap: BootstrapStatus; session: ManagementSessionSummary }
  | { kind: 'unavailable'; error: string; bootstrap?: BootstrapStatus; status?: number };

interface EntryResolvers {
  getBootstrapStatus: () => Promise<BootstrapStatus>;
  getSession: () => Promise<ManagementSessionSummary | null>;
}

let _bootstrapCache: BootstrapStatus | null = null;

export function resetBootstrapCache(): void {
  _bootstrapCache = null;
}

export async function resolveEntryStateFast(resolvers: EntryResolvers): Promise<EntryState> {
  try {
    const bootstrap = await resolvers.getBootstrapStatus();
    _bootstrapCache = bootstrap;

    if (!bootstrap.initialized) {
      return { kind: 'login_required', bootstrap };
    }

    const session = await resolvers.getSession();
    if (!session) {
      return { kind: 'login_required', bootstrap };
    }

    return { kind: 'authenticated_ready', bootstrap, session };
  } catch (error) {
    return {
      kind: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
      bootstrap: _bootstrapCache ?? undefined,
    };
  }
}
