import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from './global-search';

const pushMock = vi.fn();
const useGlobalSearchMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/domains/search', () => ({
  useGlobalSearch: (query: string) => useGlobalSearchMock(query),
}));

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useGlobalSearchMock.mockReturnValue({
      results: {
        identities: [],
        tasks: [],
        assets: [
          {
            id: 'asset-1',
            kind: 'secret',
            title: 'Signal Secret',
            subtitle: 'openai · api_token',
            href: '/assets?resourceKind=secret&resourceId=asset-1',
          },
        ],
        skills: [
          {
            id: 'skill-1',
            kind: 'capability',
            title: 'signal.skill.invoke',
            subtitle: 'proxy_only · low',
            href: '/assets?resourceKind=capability&resourceId=skill-1',
          },
        ],
        events: [
          {
            id: 'event-1',
            kind: 'event',
            title: 'Signal event',
            subtitle: 'task_completed · task:task-1',
            href: '/inbox?eventId=event-1',
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it('renders grouped backend search results for assets and skills', async () => {
    render(<GlobalSearch />);

    fireEvent.focus(screen.getByRole('searchbox', { name: 'globalSearch.ariaLabel' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'signal' } });

    expect(await screen.findByText('globalSearch.groups.assets')).toBeInTheDocument();
    expect(await screen.findByText('globalSearch.groups.skills')).toBeInTheDocument();
    expect(screen.getByText('Signal Secret')).toBeInTheDocument();
    expect(screen.getByText('signal.skill.invoke')).toBeInTheDocument();
  });

  it('navigates to the selected grouped result', async () => {
    render(<GlobalSearch />);

    fireEvent.focus(screen.getByRole('searchbox', { name: 'globalSearch.ariaLabel' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'signal' } });

    fireEvent.click(await screen.findByRole('button', { name: /signal secret/i }));

    expect(pushMock).toHaveBeenCalledWith('/assets?resourceKind=secret&resourceId=asset-1');
  });

  it('routes event search results through the inbox focus state', async () => {
    render(<GlobalSearch />);

    fireEvent.focus(screen.getByRole('searchbox', { name: 'globalSearch.ariaLabel' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'signal' } });

    fireEvent.click(await screen.findByRole('button', { name: /signal event/i }));

    expect(pushMock).toHaveBeenCalledWith('/inbox?eventId=event-1');
  });
});
