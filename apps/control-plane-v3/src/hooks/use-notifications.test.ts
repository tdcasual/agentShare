import { describe, expect, it, vi } from 'vitest';
import {
  getNotificationsSource,
  getNotificationsSWRKey,
  loadNotifications,
  markAllNotificationsReadForSource,
} from '@/hooks/use-notifications';

describe('notifications contract', () => {
  it('uses the events endpoint as the inbox source', () => {
    const source = getNotificationsSource();

    expect(source.kind).toBe('backend');
    if (source.kind !== 'backend') {
      throw new Error('Expected backend notifications source');
    }

    expect(source.endpoint).toBe('/api/events');
    expect(getNotificationsSWRKey(source)).toBe('/api/events');
  });

  it('loads events from the backend feed when available', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [{ id: 'event-1', summary: 'feedback' }] }), {
          status: 200,
        })
    );

    const notifications = await loadNotifications(getNotificationsSource(), fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(notifications).toEqual([{ id: 'event-1', summary: 'feedback' }]);
  });

  it('posts to the inbox feed when marking all events read', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    const source = getNotificationsSource();

    await markAllNotificationsReadForSource(source, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({ credentials: 'include' })
    );
  });
});
