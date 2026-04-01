/**
 * Types for the Event domain / inbox feed
 */

export type EventSeverity = 'info' | 'success' | 'warning' | 'error' | 'critical';

export interface Event {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string;
  subject_type: string;
  subject_id: string;
  summary: string;
  details?: string | null;
  severity?: EventSeverity;
  action_url?: string;
  metadata?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventListResponse {
  items: Event[];
  total?: number;
}
