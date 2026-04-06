'use client';

import { useCallback } from 'react';
import useSWR, { mutate, SWRConfiguration } from 'swr';
import { pollingConfig } from '@/lib/swr-config';
import { EVENTS_FEED_KEY, listEvents, markEventRead } from './api';

export function useEvents(options?: SWRConfiguration) {
  const {
    data,
    error,
    isLoading,
    mutate: refresh,
  } = useSWR(options?.isPaused ? null : EVENTS_FEED_KEY, () => listEvents(), {
    ...pollingConfig,
    refreshInterval: 30000,
    ...options,
  });

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
