/**
 * Event Domain Manifest
 */

export type { Event, EventSeverity, EventListResponse } from './types';

export {
  eventApi,
  listEvents,
  markEventRead,
  EVENTS_ROUTE,
  EVENTS_FEED_KEY,
} from './api';

export {
  useEvents,
  useMarkEventRead,
  refreshEvents,
} from './hooks';
