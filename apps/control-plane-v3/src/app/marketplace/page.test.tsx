import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarketplacePage from './page';

const useReviewsMock = vi.fn();
const useCatalogMock = vi.fn();
const useManagementSessionGateMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/review', () => ({
  useReviews: () => useReviewsMock(),
}));

vi.mock('@/domains/catalog', () => ({
  useCatalog: () => useCatalogMock(),
}));

describe('marketplace page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useManagementSessionGateMock.mockReturnValue({
      session: {
        email: 'owner@example.com',
        role: 'owner',
      },
      loading: false,
      error: null,
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
            created_by_actor_id: 'test-agent',
            created_via_token_id: 'token-test-agent',
            reviewed_at: null,
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useCatalogMock.mockReturnValue({
      data: {
        items: [
          {
            release_id: 'catalog-release-1',
            resource_kind: 'secret',
            resource_id: 'secret-1',
            title: 'Agent Market Secret',
            subtitle: 'openai · api_token',
            version: 1,
            release_status: 'published',
            released_at: '2026-03-31T00:00:00.000Z',
            created_by_actor_id: 'test-agent',
            created_via_token_id: 'token-test-agent',
            adoption_count: 0,
          },
          {
            release_id: 'catalog-release-2',
            resource_kind: 'capability',
            resource_id: 'capability-1',
            title: 'agent.market.capability',
            subtitle: 'proxy_only · risk medium',
            version: 1,
            release_status: 'published',
            released_at: '2026-03-31T00:00:00.000Z',
            created_by_actor_id: 'test-agent',
            created_via_token_id: 'token-test-agent',
            adoption_count: 2,
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it('shows agent-originated submissions and human oversight framing', () => {
    render(<MarketplacePage />);

    expect(screen.getByText('Agent Marketplace')).toBeInTheDocument();
    expect(screen.getByText(/Only agents publish here/i)).toBeInTheDocument();
    expect(screen.getAllByText('agent.market.capability').length).toBeGreaterThan(0);
    expect(screen.getByText('Agent Market Secret')).toBeInTheDocument();
    expect(screen.getAllByText(/Awaiting human review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Version 1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/published/i).length).toBeGreaterThan(0);
  });

  it('filters the marketplace catalog by review state', async () => {
    const user = userEvent.setup();

    useReviewsMock.mockReturnValue({
      data: {
        items: [
          {
            resource_kind: 'capability',
            resource_id: 'capability-1',
            title: 'agent.market.capability',
            publication_status: 'pending_review',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'test-agent',
            created_via_token_id: 'token-test-agent',
            reviewed_at: null,
          },
          {
            resource_kind: 'secret',
            resource_id: 'secret-2',
            title: 'rejected.market.secret',
            publication_status: 'rejected',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'test-agent',
            created_via_token_id: 'token-test-agent',
            reviewed_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    render(<MarketplacePage />);

    await user.click(screen.getByRole('button', { name: /rejected/i }));

    expect(screen.getByText('rejected.market.secret')).toBeInTheDocument();
    expect(screen.queryByText('Agent Market Secret')).not.toBeInTheDocument();
  });
});
