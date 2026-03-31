import { describe, expect, it, vi } from 'vitest';
import {
  getNotificationsSWRKey,
  getNotificationsSource,
  loadNotifications,
  markAllNotificationsReadForSource,
} from '@/hooks/use-notifications';

describe('notifications contract', () => {
  it('uses no swr key when notifications are explicitly unavailable', () => {
    const source = getNotificationsSource();

    expect(source.kind).toBe('unavailable');
    expect(getNotificationsSWRKey(source)).toBeNull();
  });

  it('does not call fetch when notifications are unavailable', async () => {
    const fetchMock = vi.fn();

    const notifications = await loadNotifications(getNotificationsSource(), fetchMock);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(notifications).toEqual([]);
  });

  it('no-ops mark-all-read when notifications are unavailable', async () => {
    const fetchMock = vi.fn();

    await markAllNotificationsReadForSource(getNotificationsSource(), fetchMock);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
