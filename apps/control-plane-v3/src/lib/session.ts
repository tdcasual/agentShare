'use client';

import type { BootstrapStatus, ManagementSessionSummary } from '@/shared/types';
import { api } from '@/lib/api';
import { resolveEntryStateFast, resetBootstrapCache } from '@/lib/entry-state';
import { setGlobalSession } from '@/lib/session-state';

export type AppEntryState =
  | { kind: 'bootstrap_required'; bootstrap: BootstrapStatus }
  | { kind: 'login_required'; bootstrap: BootstrapStatus }
  | { kind: 'authenticated_ready'; bootstrap: BootstrapStatus; session: ManagementSessionSummary }
  | { kind: 'unavailable'; error: string; bootstrap?: BootstrapStatus; status?: number };

function syncGlobalSession(entryState: AppEntryState) {
  const lastLoadedAt = Date.now();

  if (entryState.kind === 'authenticated_ready') {
    setGlobalSession({
      state: 'authenticated',
      email: entryState.session.email,
      role: entryState.session.role,
      sessionId: entryState.session.session_id,
      lastLoadedAt,
      summary: entryState.session,
    });
    return;
  }

  if (entryState.kind === 'unavailable') {
    setGlobalSession({
      state: 'unavailable',
      error: entryState.error,
      lastLoadedAt,
    });
    return;
  }

  setGlobalSession({
    state: 'anonymous',
    lastLoadedAt,
  });
}

export async function resolveAppEntryState(): Promise<AppEntryState> {
  const entryState = await resolveEntryStateFast({
    getBootstrapStatus: api.getBootstrapStatus,
    getSession: api.getSession,
  });

  syncGlobalSession(entryState);
  return entryState;
}

export { resetBootstrapCache };

/**
 * @deprecated Use useGlobalSession from session-state instead.
 * Kept for test mock backward-compatibility.
 */
export function useManagementSessionGate(_options?: {
  redirectOnMissingSession?: boolean;
}) {
  // This should never be called at runtime — all consumers have been migrated.
  // If a test mock is missing, this will throw.
  throw new Error(
    'useManagementSessionGate is deprecated. Use useGlobalSession from session-state instead.'
  );
}
