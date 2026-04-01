'use client';

import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import { Event } from '@/domains/event/types';
import { EVENTS_FEED_KEY, useEvents, useMarkEventRead } from '@/domains/event';

export type Notification = Event;

export type NotificationsSource = { kind: 'backend'; endpoint: string };

export const NOTIFICATIONS_KEY = EVENTS_FEED_KEY;
const NOTIFICATIONS_SOURCE: NotificationsSource = { kind: 'backend', endpoint: NOTIFICATIONS_KEY };

type NotificationsResponse = Pick<Response, 'ok' | 'status' | 'json'>;
type FetchLike = (input: string, init?: RequestInit) => Promise<NotificationsResponse>;

export function getNotificationsSource(): NotificationsSource {
  return NOTIFICATIONS_SOURCE;
}

export function getNotificationsSWRKey(source: NotificationsSource): string | null {
  return source.endpoint;
}

export async function loadNotifications(
  source: NotificationsSource,
  fetchImpl: FetchLike = fetch,
): Promise<Notification[]> {
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
  await fetchImpl(source.endpoint, {
    credentials: 'include',
  });
}

export function useNotifications() {
  const { events, isLoading, error, mutate } = useEvents();

  return {
    availability: 'backend' as const,
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
