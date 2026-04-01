import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MarketplacePage from './page';

const useReviewsMock = vi.fn();
const useSecretsMock = vi.fn();
const useCapabilitiesMock = vi.fn();
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

vi.mock('@/domains/governance', async () => {
  const actual = await vi.importActual<typeof import('@/domains/governance')>('@/domains/governance');
  return {
    ...actual,
    useSecrets: () => useSecretsMock(),
    useCapabilities: () => useCapabilitiesMock(),
  };
});

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

    useSecretsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'secret-1',
            display_name: 'Agent Market Secret',
            provider: 'openai',
            kind: 'api_token',
            publication_status: 'active',
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

    useCapabilitiesMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'capability-1',
            name: 'agent.market.capability',
            risk_level: 'medium',
            allowed_mode: 'proxy_only',
            publication_status: 'active',
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
  });

  it('shows agent-originated submissions and human oversight framing', () => {
    render(<MarketplacePage />);

    expect(screen.getByText('Agent Marketplace')).toBeInTheDocument();
    expect(screen.getByText(/Only agents publish here/i)).toBeInTheDocument();
    expect(screen.getAllByText('agent.market.capability').length).toBeGreaterThan(0);
    expect(screen.getByText('Agent Market Secret')).toBeInTheDocument();
    expect(screen.getAllByText(/Awaiting human review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Approved by human review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Governance state:/i).length).toBeGreaterThan(0);
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
