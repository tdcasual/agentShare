'use client';

import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import { Event } from '@/domains/event/types';
import { EVENTS_FEED_KEY, useEvents, useMarkEventRead } from '@/domains/event';

export type Notification = Event;

export type NotificationsSource =
  | { kind: 'backend'; endpoint: string }
  | { kind: 'unavailable'; reason: string };

export type NotificationsAvailability = NotificationsSource['kind'];

export const NOTIFICATIONS_KEY = EVENTS_FEED_KEY;
const NOTIFICATIONS_SOURCE: NotificationsSource = { kind: 'backend', endpoint: NOTIFICATIONS_KEY };

type FetchLike = typeof fetch;

interface UseNotificationsResult {
  availability: NotificationsAvailability;
  unavailableReason: string | null;
  notifications: Notification[];
  isLoading: boolean;
  error: unknown;
  mutate: () => Promise<unknown>;
}

export function getNotificationsSource(): NotificationsSource {
  return NOTIFICATIONS_SOURCE;
}

export function getNotificationsSWRKey(source: NotificationsSource): string | null {
  return source.kind === 'backend' ? source.endpoint : null;
}

export async function loadNotifications(
  source: NotificationsSource,
  fetchImpl: FetchLike = fetch,
): Promise<Notification[]> {
  if (source.kind === 'unavailable') {
    logger.notifications.info(source.reason);
    return [];
  }

  try {
    const response = await fetchImpl(source.endpoint, {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404 || response.status === 501) {
        logger.notifications.info('Backend not available, returning empty list');
        return [];
      }
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    const payload = await response.json();
    return (payload?.items as Notification[]) ?? [];
  } catch (error) {
    logger.notifications.error('Fetch error:', error);
    return [];
  }
}

export async function markAllNotificationsReadForSource(
  source: NotificationsSource,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  if (source.kind === 'unavailable') {
    logger.notifications.info('Notifications unavailable; skipping mark-all-read');
    return;
  }

  await fetchImpl(source.endpoint, {
    credentials: 'include',
  });
}

export function useNotifications(): UseNotificationsResult {
  const { events, isLoading, error, mutate } = useEvents();

  return {
    availability: 'backend',
    unavailableReason: null,
    notifications: events,
    isLoading,
    error,
    mutate,
  };
}

export function useMarkNotificationsRead() {
  const markEventRead = useMarkEventRead();
  const [isMarking, setIsMarking] = useState(false);

  const markAllRead = useCallback(
    async (eventIds: string[]) => {
      if (eventIds.length === 0) {
        return;
      }

      setIsMarking(true);
      try {
        await Promise.all(eventIds.map((id) => markEventRead(id)));
      } finally {
        setIsMarking(false);
      }
    },
    [markEventRead]
  );

  return {
    markAllRead,
    markOneRead: markEventRead,
    isMarking,
  };
}
