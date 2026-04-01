/**
 * Event Domain API
 */

import { apiFetch } from '@/lib/api-client';
import type { Event, EventListResponse } from './types';

export const EVENTS_ROUTE = '/events';
export const EVENTS_FEED_KEY = '/api/events';

export function listEvents() {
  return apiFetch<EventListResponse>(EVENTS_ROUTE);
}

export function markEventRead(eventId: string) {
  return apiFetch<Event>(`${EVENTS_ROUTE}/${eventId}/read`, {
    method: 'POST',
  });
}

export const eventApi = {
  listEvents,
  markEventRead,
};
