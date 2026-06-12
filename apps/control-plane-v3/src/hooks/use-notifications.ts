'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';

export interface Notification {
  id: string;
  type: string;
  summary: string;
  read: boolean;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  isLoading: boolean;
  error: unknown;
  mutate: () => Promise<unknown>;
}

export function useNotifications(): UseNotificationsResult {
  const { data, isLoading, error, mutate } = useSWR<{ items: Notification[] }>(
    '/api/events',
    async (url: string) => {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        // Events endpoint may not exist; return empty list
        return { items: [] };
      }
      return response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    notifications: data?.items ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useMarkNotificationsRead() {
  const [isMarking, setIsMarking] = useState(false);

  const markAllRead = useCallback(async (_eventIds: string[]) => {
    // No-op: events endpoint not available in VaultGate
    setIsMarking(true);
    setIsMarking(false);
  }, []);

  const markOneRead = useCallback(async (_id: string) => {
    // No-op: events endpoint not available in VaultGate
  }, []);

  return {
    markAllRead,
    markOneRead,
    isMarking,
  };
}
