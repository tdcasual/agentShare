'use client';

import { useCallback } from 'react';
import useSWR, { mutate, SWRConfiguration } from 'swr';
import { swrConfig } from '@/lib/swr-config';
import { EVENTS_FEED_KEY, listEvents, markEventRead } from './api';

export function useEvents(options?: SWRConfiguration) {
  const { data, error, isLoading, mutate: refresh } = useSWR(
    EVENTS_FEED_KEY,
    () => listEvents(),
    {
      ...swrConfig,
      refreshInterval: 30000,
      revalidateOnFocus: true,
      ...options,
    }
  );

  return {
    events: data?.items ?? [],
    isLoading,
    error,
    mutate: refresh,
  };
}

export function useMarkEventRead() {
  return useCallback(async (eventId: string) => {
    const result = await markEventRead(eventId);
    await mutate(EVENTS_FEED_KEY);
    return result;
  }, []);
}

export function refreshEvents() {
  return mutate(EVENTS_FEED_KEY);
}
