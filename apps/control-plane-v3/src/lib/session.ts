'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BootstrapStatus, ManagementSessionSummary } from '@/shared/types';
import { ApiError, api } from '@/lib/api';

export type AppEntryState =
  | { kind: 'setup'; bootstrap: BootstrapStatus }
  | { kind: 'login'; bootstrap: BootstrapStatus }
  | { kind: 'ready'; bootstrap: BootstrapStatus; session: ManagementSessionSummary };

export async function resolveAppEntryState(): Promise<AppEntryState> {
  const bootstrap = await api.getBootstrapStatus();
  if (!bootstrap.initialized) {
    return { kind: 'setup', bootstrap };
  }

  try {
    const session = await api.getSession();
    return { kind: 'ready', bootstrap, session };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { kind: 'login', bootstrap };
    }
    throw error;
  }
}

export function useManagementSessionGate() {
  const router = useRouter();
  const [session, setSession] = useState<ManagementSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const bootstrap = await api.getBootstrapStatus();
        if (cancelled) {
          return;
        }
        if (!bootstrap.initialized) {
          router.replace('/setup');
          return;
        }

        const currentSession = await api.getSession();
        if (cancelled) {
          return;
        }
        setSession(currentSession);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        if (loadError instanceof ApiError && loadError.status === 401) {
          router.replace('/login');
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Failed to load management session');
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
  }, [refreshNonce, router]);

  return {
    session,
    loading,
    error,
    refreshSession: () => setRefreshNonce((current) => current + 1),
  };
}
