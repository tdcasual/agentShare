/**
 * Runtime-scoped identity hooks.
 *
 * These hooks depend on the demo/runtime context and should only be imported
 * from runtime or sandbox surfaces.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRuntime } from '@/core/runtime';
import { IdentityRegistryServiceId } from '@/domains/identity/services/identity-registry';
import type { Identity, IdentityType, PresenceStatus } from '@/shared/types';


export interface UseIdentityReturn {
  identities: Identity[];
  currentIdentity: Identity | null;
  onlineIdentities: Identity[];
  isLoading: boolean;
  error: Error | null;
  setPresence: (identityId: string, status: PresenceStatus) => void;
  refresh: () => void;
}

export function useRuntimeIdentities(): UseIdentityReturn {
  const runtime = useRuntime();
  const registry = useMemo(() => runtime.di.resolve(IdentityRegistryServiceId), [runtime]);

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [currentIdentity, setCurrentIdentity] = useState<Identity | null>(null);
  const [onlineIdentities, setOnlineIdentities] = useState<Identity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

        const all = registry.getAll();
        const online = all.filter((identity) => identity.presence === 'online');
        const firstHuman = all.find((identity) => identity.type === 'human') || null;

        if (mounted) {
          setIdentities(all);
          setOnlineIdentities(online);
          setCurrentIdentity(firstHuman);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('加载身份列表失败'));
          setIsLoading(false);
        }
      }
    }

    void load();

    const unsubscribe = registry.onPresenceChanged((identityId, status) => {
      if (mounted) {
        setIdentities((current) =>
          current.map((identity) =>
            identity.id === identityId ? { ...identity, presence: status } : identity
          )
        );
        setOnlineIdentities(registry.getAll().filter((identity) => identity.presence === 'online'));
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [registry, refreshNonce]);

  const setPresence = useCallback(
    (identityId: string, status: PresenceStatus) => {
      registry.setPresence(identityId, status);
    },
    [registry]
  );

  const refresh = useCallback(() => {
    setRefreshNonce((current) => current + 1);
  }, []);

  return {
    identities,
    currentIdentity,
    onlineIdentities,
    isLoading,
    error,
    setPresence,
    refresh,
  };
}

export function useRuntimeIdentity(identityId: string | null) {
  const runtime = useRuntime();
  const registry = runtime.di.resolve(IdentityRegistryServiceId);

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(!!identityId);

  useEffect(() => {
    if (!identityId) {
      setIdentity(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    async function load() {
      setIsLoading(true);
      if (!identityId) {
        return;
      }

      const found = registry.getById(identityId);
      if (mounted) {
        setIdentity(found || null);
        setIsLoading(false);
      }
    }

    void load();

    const unsubscribe = registry.onPresenceChanged((changedId, status) => {
      if (mounted && changedId === identityId) {
        setIdentity((current) => (current ? { ...current, presence: status } : null));
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [identityId, registry]);

  return { identity, isLoading };
}

export function useRuntimeIdentitiesByType(type: IdentityType) {
  const { identities, isLoading, error } = useRuntimeIdentities();

  return {
    identities: identities.filter((identity) => identity.type === type),
    isLoading,
    error,
  };
}
