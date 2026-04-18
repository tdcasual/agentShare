import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translateMessage } from '@/test-utils/i18n-mock';
import HubPage from './page';

const t = translateMessage;
const replaceMock = vi.fn();
const resolveAppEntryStateMock = vi.fn();
const useEventsMock = vi.fn();
const useAdminAccountsMock = vi.fn();
const useAgentsWithTokensMock = vi.fn();
const useReviewsMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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
    locale: 'en',
    t: translateMessage,
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
          summary: 'Bootstrap Credential completed Sync Config',
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
          name: 'Bootstrap Credential',
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
            displayName: 'Bootstrap Primary',
            status: 'active',
            trustScore: 0.94,
            scopes: [],
            labels: {},
          },
          {
            id: 'token-2',
            displayName: 'Bootstrap Backup',
            status: 'active',
            trustScore: 0.88,
            scopes: [],
            labels: {},
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
    expect(screen.getByText('Bootstrap Credential')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Primary')).toBeInTheDocument();
    expect(screen.getByText('agent.market.capability')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap Credential completed Sync Config')).toBeInTheDocument();
    expect(screen.getByText(t('hub.snapshotDataSource'))).toBeInTheDocument();
    expect(screen.getAllByText(/^Owner$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Active$/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^owner$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^active$/)).not.toBeInTheDocument();
  });
});
