import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import ReviewsPage from './page';

let mockSearchParams = new URLSearchParams();
const useManagementSessionGateMock = vi.fn();
const useReviewsMock = vi.fn();
const useApproveReviewMock = vi.fn();
const useRejectReviewMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/review', () => ({
  useReviews: () => useReviewsMock(),
  useApproveReview: () => useApproveReviewMock(),
  useRejectReview: () => useRejectReviewMock(),
}));

describe('reviews page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

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
            resource_kind: 'task',
            resource_id: 'task-1',
            title: 'Approve Sync Config',
            publication_status: 'pending',
            created_by_actor_type: 'human',
            created_by_actor_id: 'owner-1',
            created_via_token_id: null,
            reviewed_at: null,
          },
          {
            resource_kind: 'capability',
            resource_id: 'capability-1',
            title: 'Publish research.search capability',
            publication_status: 'pending_review',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'bootstrap',
            created_via_token_id: 'token-bootstrap',
            reviewed_at: null,
          },
          {
            resource_kind: 'secret',
            resource_id: 'secret-1',
            title: 'Register OpenAI production key',
            publication_status: 'pending_review',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'analyzer',
            created_via_token_id: null,
            reviewed_at: null,
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    useApproveReviewMock.mockReturnValue(vi.fn());
    useRejectReviewMock.mockReturnValue(vi.fn());
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    const mutateMock = vi.fn().mockRejectedValue(new ApiError(401, 'Missing management session'));

    useReviewsMock.mockReturnValue({
      ...useReviewsMock(),
      mutate: mutateMock,
    });

    render(<ReviewsPage />);

    await user.click(screen.getByRole('button', { name: /reviews.actions.refreshQueue/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a relogin recovery state when review queries return unauthorized', () => {
    useReviewsMock.mockReturnValue({
      ...useReviewsMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<ReviewsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('filters the review queue by submission provenance', async () => {
    const user = userEvent.setup();

    render(<ReviewsPage />);

    await user.click(screen.getByRole('button', { name: /agent submissions/i }));

    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Publish research.search capability')).toBeInTheDocument();
    expect(screen.getByText('Register OpenAI production key')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /token-originated/i }));

    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Publish research.search capability')).toBeInTheDocument();
    expect(screen.queryByText('Register OpenAI production key')).not.toBeInTheDocument();
  });

  it('filters the review queue by resource kind and surfaces provenance metrics', async () => {
    const user = userEvent.setup();

    render(<ReviewsPage />);

    expect(screen.getByText('2 agent submissions')).toBeInTheDocument();
    expect(screen.getByText('1 token-originated')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /capabilities/i }));

    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Publish research.search capability')).toBeInTheDocument();
    expect(screen.queryByText('Register OpenAI production key')).not.toBeInTheDocument();
    expect(screen.getByText('Submitted by agent:bootstrap')).toBeInTheDocument();
    expect(screen.getAllByText('token-bootstrap').length).toBeGreaterThan(0);
  });

  it('prefilters by resource kind and highlights the focused review item', () => {
    mockSearchParams = new URLSearchParams('resourceKind=capability&resourceId=capability-1');

    render(<ReviewsPage />);

    expect(screen.getByText('Focused review item')).toBeInTheDocument();
    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByTestId('review-card-capability-capability-1')).toHaveAttribute('data-focus-state', 'focused');
  });

  it('normalizes governance status wording for approved and rejected review items', () => {
    useReviewsMock.mockReturnValue({
      data: {
        items: [
          {
            resource_kind: 'capability',
            resource_id: 'capability-2',
            title: 'Approved market capability',
            publication_status: 'active',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'bootstrap',
            created_via_token_id: 'token-bootstrap',
            reviewed_at: '2026-03-31T00:00:00.000Z',
          },
          {
            resource_kind: 'secret',
            resource_id: 'secret-2',
            title: 'Rejected market secret',
            publication_status: 'rejected',
            created_by_actor_type: 'agent',
            created_by_actor_id: 'analyzer',
            created_via_token_id: null,
            reviewed_at: '2026-03-31T01:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
      mutate: vi.fn().mockResolvedValue(undefined),
    });

    render(<ReviewsPage />);

    expect(screen.getByText('Approved market capability')).toBeInTheDocument();
    expect(screen.getByText('Rejected market secret')).toBeInTheDocument();
    expect(screen.getByText('Approved by human review')).toBeInTheDocument();
    expect(screen.getByText('Rejected by human review')).toBeInTheDocument();
  });
});
