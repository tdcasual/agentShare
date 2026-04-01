/**
 * Identity 领域 Hooks - 解耦 UI 与 Runtime
 * 
 * 提供 React 友好的 API，隐藏 Runtime 复杂性
 */

import { useCallback, useEffect, useState } from 'react';
import { useRuntime } from '@/core/runtime';
import { IdentityRegistryServiceId } from '@/domains/identity/services/identity-registry';
import type { Identity, IdentityType, PresenceStatus } from '@/shared/types';

export interface UseIdentityOptions {
  includeOffline?: boolean;
}

export interface UseIdentityReturn {
  // 数据
  identities: Identity[];
  currentIdentity: Identity | null;
  onlineIdentities: Identity[];
  
  // 加载状态
  isLoading: boolean;
  error: Error | null;
  
  // 操作
  setPresence: (identityId: string, status: PresenceStatus) => void;
  refresh: () => void;
}

/**
 * 获取所有身份列表
 */
export function useIdentities(options: UseIdentityOptions = {}): UseIdentityReturn {
  const runtime = useRuntime();
  const registry = runtime.di.resolve(IdentityRegistryServiceId);
  void options;
  
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
        const online = all.filter(i => i.presence === 'online');
        const firstHuman = all.find(i => i.type === 'human') || null;
        
        if (mounted) {
          setIdentities(all);
          setOnlineIdentities(online);
          setCurrentIdentity(firstHuman);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load identities'));
          setIsLoading(false);
        }
      }
    }
    
    load();
    
    // 订阅在线状态变化
    const unsubscribe = registry.onPresenceChanged((id, status) => {
      if (mounted) {
        setIdentities(prev => prev.map(i => 
          i.id === id ? { ...i, presence: status } : i
        ));
        setOnlineIdentities(registry.getAll().filter(i => i.presence === 'online'));
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [registry, refreshNonce]);

  const setPresence = useCallback((identityId: string, status: PresenceStatus) => {
    registry.setPresence(identityId, status);
  }, [registry]);

  const refresh = useCallback(() => {
    setRefreshNonce(n => n + 1);
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

/**
 * 获取单个身份
 */
export function useIdentity(identityId: string | null) {
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
    
    load();
    
    // 订阅该身份的变化
    const unsubscribe = registry.onPresenceChanged((id, status) => {
      if (mounted && id === identityId) {
        setIdentity(prev => prev ? { ...prev, presence: status } : null);
      }
    });
    
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [identityId, registry]);

  return { identity, isLoading };
}

/**
 * 按类型筛选身份
 */
export function useIdentitiesByType(type: IdentityType) {
  const { identities, isLoading, error } = useIdentities();
  
  const filtered = identities.filter(i => i.type === type);
  
  return {
    identities: filtered,
    isLoading,
    error,
  };
}

/**
 * Mock hook 用于测试/Storybook
 */
export function useMockIdentities(mockData: Partial<UseIdentityReturn> = {}): UseIdentityReturn {
  return {
    identities: [],
    currentIdentity: null,
    onlineIdentities: [],
    isLoading: false,
    error: null,
    setPresence: () => {},
    refresh: () => {},
    ...mockData,
  };
}
