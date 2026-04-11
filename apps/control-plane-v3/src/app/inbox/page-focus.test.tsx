import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InboxPage from './page';

const pushMock = vi.fn();
const useEventsMock = vi.fn();
const markEventReadMock = vi.fn();
const mutateMock = vi.fn();
const searchParams = new URLSearchParams('eventId=event-1');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/domains/event', () => ({
  useEvents: () => useEventsMock(),
  useMarkEventRead: () => markEventReadMock,
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('inbox focused entry state', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mutateMock.mockResolvedValue(undefined);
    markEventReadMock.mockResolvedValue(undefined);

    useEventsMock.mockReturnValue({
      events: [
        {
          id: 'event-1',
          event_type: 'task_completed',
          actor_type: 'agent',
          actor_id: 'bootstrap',
          subject_type: 'task',
          subject_id: 'task-1',
          summary: 'Bootstrap finished Sync Config',
          details: 'Published completion feedback',
          severity: 'success',
          action_url: '/tasks?taskId=task-1',
          read_at: null,
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
        },
        {
          id: 'event-2',
          event_type: 'task_feedback_posted',
          actor_type: 'human',
          actor_id: 'owner',
          subject_type: 'task_target',
          subject_id: 'target-2',
          summary: 'Owner reviewed Risk Scan',
          details: 'Accepted the run',
          severity: 'info',
          action_url: '/tasks?taskId=task-2',
          read_at: '2026-03-31T01:00:00.000Z',
          created_at: '2026-03-31T01:00:00.000Z',
          updated_at: '2026-03-31T01:00:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
      mutate: mutateMock,
    });
  });

  it('highlights the focused event and renders a task-specific context summary', () => {
    render(<InboxPage />);

    const focusedSummary = screen.getByText('inbox.focusedEvent').closest('[role="region"]');

    expect(focusedSummary).not.toBeNull();
    expect(
      within(focusedSummary as HTMLElement).getByText('Bootstrap finished Sync Config')
    ).toBeInTheDocument();
    expect(
      within(focusedSummary as HTMLElement).getByRole('button', {
        name: /inbox.actionLabels.openTask/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByTestId('inbox-event-event-1')).toHaveAttribute(
      'data-focus-state',
      'focused'
    );
    expect(screen.getByTestId('inbox-event-event-2')).toHaveAttribute(
      'data-focus-state',
      'default'
    );
  });

  it('marks the focused event as read without breaking mutate refresh', async () => {
    const user = userEvent.setup();

    render(<InboxPage />);

    const focusedSummary = screen.getByText('inbox.focusedEvent').closest('[role="region"]');

    await user.click(
      within(focusedSummary as HTMLElement).getByRole('button', { name: /inbox.markAsRead/i })
    );

    await waitFor(() => {
      expect(markEventReadMock).toHaveBeenCalledWith('event-1');
    });

    expect(mutateMock).toHaveBeenCalled();
  });
});
