import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRuntime } from '@/core/runtime';
import type { Identity } from '@/domains/identity/types';
import {
  IdentityRegistryServiceId,
  type IdentityRegistry,
} from '@/domains/identity/services/identity-registry';
import { isDemoRoute, isManagementRoute } from '@/lib/route-policy';
import { useSession, type SessionData } from '@/lib/session-state';

interface ShellIdentitySnapshot {
  currentIdentity: Identity | null;
  onlineIdentities: Identity[];
}

interface ShellIdentityInput {
  pathname: string;
  session: SessionData;
  runtime: ShellIdentitySnapshot;
}

interface RuntimeShellIdentityState extends ShellIdentitySnapshot {
  isLoading: boolean;
  error: Error | null;
}

function usesManagementShellIdentity(pathname: string): boolean {
  return pathname === '/' || isManagementRoute(pathname);
}

function createSessionShellIdentity(session: SessionData): Identity | null {
  if (session.state !== 'authenticated') {
    return null;
  }

  const createdAt = new Date('1970-01-01T00:00:00.000Z');
  const role = session.role ?? 'operator';
  const email = session.email?.trim();
  const identityId = session.sessionId ?? email ?? role;

  return {
    id: `session:${identityId}`,
    type: 'human',
    profile: {
      name: email && email.length > 0 ? email : `Management ${role}`,
      avatar: '',
      bio: email && email.length > 0 ? `Signed in as ${email}` : 'Signed-in management operator',
      tags: [`role:${role}`],
      createdAt,
    },
    status: 'active',
    presence: 'online',
    session: {
      managementRole: role,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function readRuntimeShellIdentity(registry: IdentityRegistry): ShellIdentitySnapshot {
  const identities = registry.getAll();

  return {
    currentIdentity:
      identities.find((identity) => identity.type === 'human') ?? identities[0] ?? null,
    onlineIdentities: identities.filter((identity) => identity.presence === 'online'),
  };
}

function resolveSessionShellError(session: SessionData): Error | null {
  if (session.state === 'forbidden') {
    return new Error(session.error ?? 'Management access is forbidden');
  }

  if (session.state === 'unavailable') {
    return new Error(session.error ?? 'Management session is unavailable');
  }

  return null;
}

export function buildShellIdentityState({
  pathname,
  session,
  runtime,
}: ShellIdentityInput): ShellIdentitySnapshot {
  if (isDemoRoute(pathname)) {
    return runtime;
  }

  if (usesManagementShellIdentity(pathname)) {
    return {
      currentIdentity: createSessionShellIdentity(session),
      onlineIdentities: [],
    };
  }

  return runtime;
}

export function useShellIdentity() {
  const pathname = usePathname() ?? '/';
  const runtime = useRuntime();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [runtimeState, setRuntimeState] = useState<RuntimeShellIdentityState>({
    currentIdentity: null,
    onlineIdentities: [],
    isLoading: !usesManagementShellIdentity(pathname),
    error: null,
  });
  const { session, isLoading: isSessionLoading, refresh: refreshSession } = useSession();

  const useManagementShell = usesManagementShellIdentity(pathname) && !isDemoRoute(pathname);

  useEffect(() => {
    if (useManagementShell) {
      setRuntimeState({
        currentIdentity: null,
        onlineIdentities: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    let mounted = true;
    let unsubscribe = () => {};

    setRuntimeState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    try {
      const registry = runtime.di.resolve(IdentityRegistryServiceId);
      const syncRuntimeIdentity = () => {
        if (!mounted) {
          return;
        }

        setRuntimeState({
          ...readRuntimeShellIdentity(registry),
          isLoading: false,
          error: null,
        });
      };

      syncRuntimeIdentity();
      unsubscribe = registry.onPresenceChanged(() => {
        syncRuntimeIdentity();
      });
    } catch (error) {
      if (mounted) {
        setRuntimeState({
          currentIdentity: null,
          onlineIdentities: [],
          isLoading: false,
          error: error instanceof Error ? error : new Error('加载身份列表失败'),
        });
      }
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [pathname, refreshNonce, runtime, useManagementShell]);

  const shellIdentity = useMemo(
    () =>
      buildShellIdentityState({
        pathname,
        session,
        runtime: runtimeState,
      }),
    [pathname, runtimeState, session]
  );

  const refresh = useCallback(() => {
    if (useManagementShell) {
      void refreshSession();
      return;
    }

    setRefreshNonce((current) => current + 1);
  }, [refreshSession, useManagementShell]);

  return {
    currentIdentity: shellIdentity.currentIdentity,
    onlineIdentities: shellIdentity.onlineIdentities,
    isLoading: useManagementShell ? isSessionLoading : runtimeState.isLoading,
    error: useManagementShell ? resolveSessionShellError(session) : runtimeState.error,
    refresh,
  };
}
