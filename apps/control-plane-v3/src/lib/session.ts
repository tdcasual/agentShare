'use client';

import type { BootstrapStatus, ManagementSessionSummary } from '@/shared/types';
import { getCurrentUser } from '@/lib/vaultgate-api';
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

async function getBootstrapStatus() {
  // VaultGate always requires login; no separate bootstrap status
  return { initialized: true };
}

async function getSession(): Promise<ManagementSessionSummary | null> {
  try {
    const user = await getCurrentUser();
    return {
      status: 'active',
      actor_type: 'human',
      actor_id: user.id,
      role: 'admin',
      auth_method: 'session',
      session_id: '',
      email: user.email,
      expires_in: 43200,
      issued_at: 0,
      expires_at: 43200,
    };
  } catch {
    return null;
  }
}

export async function resolveAppEntryState(): Promise<AppEntryState> {
  const entryState = await resolveEntryStateFast({
    getBootstrapStatus,
    getSession,
  });

  syncGlobalSession(entryState);
  return entryState;
}

export { resetBootstrapCache };
