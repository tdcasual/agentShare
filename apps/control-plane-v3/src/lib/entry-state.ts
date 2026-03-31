import type { BootstrapStatus, ManagementSessionSummary } from '@/shared/types';
import { ApiError } from '@/lib/api-client';

export type ResolvedEntryState =
  | { kind: 'bootstrap_required'; bootstrap: BootstrapStatus }
  | { kind: 'login_required'; bootstrap: BootstrapStatus }
  | { kind: 'authenticated_ready'; bootstrap: BootstrapStatus; session: ManagementSessionSummary }
  | { kind: 'unavailable'; error: string; bootstrap?: BootstrapStatus; status?: number };

interface EntryStateResolvers {
  getBootstrapStatus: () => Promise<BootstrapStatus>;
  getSession: () => Promise<ManagementSessionSummary>;
}

export async function resolveEntryState({
  getBootstrapStatus,
  getSession,
}: EntryStateResolvers): Promise<ResolvedEntryState> {
  let bootstrap: BootstrapStatus;

  try {
    bootstrap = await getBootstrapStatus();
  } catch (error) {
    return {
      kind: 'unavailable',
      error: error instanceof Error ? error.message : 'Failed to resolve bootstrap status',
      status: error instanceof ApiError ? error.status : undefined,
    };
  }

  if (!bootstrap.initialized) {
    return {
      kind: 'bootstrap_required',
      bootstrap,
    };
  }

  try {
    const session = await getSession();
    return {
      kind: 'authenticated_ready',
      bootstrap,
      session,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return {
        kind: 'login_required',
        bootstrap,
      };
    }

    return {
      kind: 'unavailable',
      bootstrap,
      error: error instanceof Error ? error.message : 'Failed to resolve management session',
      status: error instanceof ApiError ? error.status : undefined,
    };
  }
}
