import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRuntimeOptional } from '@/core/runtime';
import type { Identity } from '@/domains/identity/types';
import {
  IdentityRegistryServiceId,
  type IdentityRegistry,
} from '@/domains/identity/services/identity-registry';

export interface RuntimeShellIdentityState {
  currentIdentity: Identity | null;
  onlineIdentities: Identity[];
  isLoading: boolean;
  error: Error | null;
}

function readRuntimeShellIdentity(registry: IdentityRegistry) {
  const identities = registry.getAll();

  return {
    currentIdentity:
      identities.find((identity) => identity.type === 'human') ?? identities[0] ?? null,
    onlineIdentities: identities.filter((identity) => identity.presence === 'online'),
  };
}

export function useRuntimeShellIdentity() {
  const runtime = useRuntimeOptional();
  const runtimeRef = useRef(runtime);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [state, setState] = useState<RuntimeShellIdentityState>({
    currentIdentity: null,
    onlineIdentities: [],
    isLoading: true,
    error: null,
  });

  useLayoutEffect(() => {
    runtimeRef.current = runtime;
  });

  useEffect(() => {
    if (!runtime) {
      setState({
        currentIdentity: null,
        onlineIdentities: [],
        isLoading: false,
        error: new Error('Demo runtime is unavailable for this route'),
      });
      return;
    }

    let mounted = true;
    let unsubscribe = () => {};
    const activeRuntime = runtimeRef.current;

    setState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    try {
      if (!activeRuntime) {
        throw new Error('Demo runtime is unavailable for this route');
      }

      const registry = activeRuntime.di.resolve(IdentityRegistryServiceId);
      const syncRuntimeIdentity = () => {
        if (!mounted) {
          return;
        }

        setState({
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
        setState({
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
  }, [refreshNonce, runtime]);

  return {
    ...state,
    refresh: () => {
      setRefreshNonce((current) => current + 1);
    },
  };
}
