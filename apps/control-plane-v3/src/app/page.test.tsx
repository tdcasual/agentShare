import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HubPage from './page';

const replaceMock = vi.fn();
const resolveAppEntryStateMock = vi.fn();
const useEventsMock = vi.fn();
const useAdminAccountsMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const useReviewsMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('../interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/session', () => ({
  resolveAppEntryState: () => resolveAppEntryStateMock(),
}));

vi.mock('@/domains/event', () => ({
  useEvents: () => useEventsMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAdminAccounts: () => useAdminAccountsMock(),
  useAgentsWithTokens: () => useAgentsWithTokensMock(),
}));

vi.mock('@/domains/review', () => ({
  useReviews: () => useReviewsMock(),
}));

describe('hub page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    resolveAppEntryStateMock.mockResolvedValue({
      kind: 'authenticated_ready',
      session: {
        email: 'owner@example.com',
        role: 'owner',
      },
    });

    useEventsMock.mockReturnValue({
      events: [
        {
          id: 'event-1',
          actor_id: 'bootstrap',
          actor_type: 'agent',
          event_type: 'task_completed',
          subject_type: 'task',
          subject_id: 'task-1',
          summary: 'Bootstrap completed Sync Config',
          details: 'Published follow-up feedback',
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
          severity: 'success',
        },
      ],
    });

    useAdminAccountsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'admin-owner',
            email: 'owner@example.com',
            display_name: 'Founding Owner',
            role: 'owner',
            status: 'active',
            created_at: '2026-03-31T00:00:00.000Z',
            updated_at: '2026-03-31T00:00:00.000Z',
          },
          {
            id: 'admin-operator',
            email: 'alice@example.com',
            display_name: 'Alice Operator',
            role: 'operator',
            status: 'active',
            created_at: '2026-03-31T00:00:00.000Z',
            updated_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useAgentsWithTokensMock.mockReturnValue({
      agents: [
        {
          id: 'bootstrap',
          name: 'Bootstrap Agent',
          risk_tier: 'high',
          auth_method: 'api_key',
          status: 'active',
          created_at: '2026-03-31T00:00:00.000Z',
          updated_at: '2026-03-31T00:00:00.000Z',
        },
      ],
      tokensByAgent: {
        bootstrap: [
          {
            id: 'token-1',
            display_name: 'Bootstrap Primary',
            status: 'active',
            trust_score: 0.94,
            created_at: '2026-03-31T00:00:00.000Z',
          },
          {
            id: 'token-2',
            display_name: 'Bootstrap Backup',
            status: 'active',
            trust_score: 0.88,
            created_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });

    useReviewsMock.mockReturnValue({
      data: {
        items: [
          {
            resource_kind: 'capability',
            resource_id: 'capability-1',
            title: 'agent.market.capability',
            publication_status: 'pending_review',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'bootstrap',
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it('renders backend-backed management identities and review snapshot on the hub', async () => {
    render(<HubPage />);

    await waitFor(() => {
      expect(screen.getByText('Founding Owner')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Operator')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Agent')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Primary')).toBeInTheDocument();
    expect(screen.getByText('agent.market.capability')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap completed Sync Config')).toBeInTheDocument();
  });
});
