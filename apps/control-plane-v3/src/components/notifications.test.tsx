import { createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Notifications } from './notifications';

const pushMock = vi.fn();
const mutateMock = vi.fn().mockResolvedValue(undefined);
const markOneReadMock = vi.fn();
const markAllReadMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: () => ({
    containerRef: createRef<HTMLDivElement>(),
  }),
}));

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    availability: 'backend',
    notifications: [
      {
        id: 'event-1',
        summary: 'Open task',
        details: 'Task is ready',
        event_type: 'task_ready',
        actor_type: 'agent',
        severity: 'info',
        created_at: '2026-04-15T12:00:00.000Z',
        action_url: '/tasks/task-1',
        read_at: null,
      },
    ],
    isLoading: false,
    error: null,
    mutate: mutateMock,
  }),
  useMarkNotificationsRead: () => ({
    markAllRead: markAllReadMock,
    markOneRead: markOneReadMock,
    isMarking: false,
  }),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string, values?: Record<string, string | number>) => {
      if (key === 'notifications.title') {
        return 'Notifications';
      }
      if (key === 'notifications.openInbox') {
        return 'Open inbox';
      }
      if (key === 'notifications.notification') {
        return 'Notification';
      }
      if (key === 'notifications.unreadLabel') {
        return 'Unread';
      }
      if (key === 'notifications.buttonAriaLabelWithUnread') {
        return `Notifications (${values?.count ?? 0})`;
      }
      if (key === 'notifications.unreadCount') {
        return `${values?.count ?? 0} unread`;
      }
      if (key === 'common.closeNotifications') {
        return 'Close notifications';
      }
      if (key === 'time.justNow') {
        return 'just now';
      }
      if (key === 'time.minutesAgo') {
        return `${values?.n ?? 0} minutes ago`;
      }
      if (key === 'time.hoursAgo') {
        return `${values?.n ?? 0} hours ago`;
      }
      if (key === 'time.daysAgo') {
        return `${values?.n ?? 0} days ago`;
      }
      if (key === 'notifications.markAllRead') {
        return 'Mark all read';
      }
      if (key === 'notifications.errors.markAllReadFailed') {
        return 'Failed to mark all read';
      }
      return key;
    },
  }),
}));

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the dropdown as a dialog panel instead of a menu', () => {
    render(<Notifications />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications (1)' }));

    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('still navigates to the action url when mark-as-read fails', async () => {
    markOneReadMock.mockRejectedValueOnce(new Error('read failed'));

    render(<Notifications />);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications (1)' }));
    fireEvent.click(screen.getByRole('button', { name: /Unread Open task/ }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/tasks/task-1');
    });
  });
});
