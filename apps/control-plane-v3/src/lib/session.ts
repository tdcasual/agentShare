'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BootstrapStatus, ManagementSessionSummary } from '@/shared/types';
import { api } from '@/lib/api';
import { resolveEntryState } from '@/lib/entry-state';
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
  const entryState = await resolveEntryState({
    getBootstrapStatus: api.getBootstrapStatus,
    getSession: api.getSession,
  });

  syncGlobalSession(entryState);
  return entryState;
}

interface ManagementSessionGateOptions {
  redirectOnMissingSession?: boolean;
}

export function useManagementSessionGate(options: ManagementSessionGateOptions = {}) {
  const router = useRouter();
  const [session, setSession] = useState<ManagementSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const redirectOnMissingSession = options.redirectOnMissingSession ?? true;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (cancelled) {
          return;
        }
        const nextState = await resolveAppEntryState();
        if (cancelled) {
          return;
        }

        if (nextState.kind === 'bootstrap_required') {
          setSession(null);
          router.replace('/setup');
          return;
        }

        if (nextState.kind === 'login_required') {
          setSession(null);
          if (redirectOnMissingSession) {
            router.replace('/login');
          } else {
            setSession(null);
          }
          return;
        }

        if (nextState.kind === 'unavailable') {
          setSession(null);
          setError(nextState.error);
          return;
        }

        setSession(nextState.session);
      } catch (loadError) {
        if (!cancelled) {
          setSession(null);
          setError(
            loadError instanceof Error ? loadError.message : 'Failed to load management session'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [redirectOnMissingSession, refreshNonce, router]);

  return {
    session,
    loading,
    error,
    refreshSession: () => setRefreshNonce((current) => current + 1),
  };
}
