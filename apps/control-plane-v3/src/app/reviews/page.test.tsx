import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import { translateMessage } from '@/test-utils/i18n-mock';
import ReviewsPage from './page';

const t = translateMessage;

let mockSearchParams = new URLSearchParams();
const useManagementSessionGateMock = vi.fn();
const useReviewsMock = vi.fn();
const useApproveReviewMock = vi.fn();
const useRejectReviewMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
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

    await user.click(screen.getByRole('button', { name: t('reviews.actions.refreshQueue') }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(t('reviews.sessionExpired'));
    });

    expect(screen.getByRole('link', { name: t('auth.logout.continueToLogin') })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when review queries return unauthorized', () => {
    useReviewsMock.mockReturnValue({
      ...useReviewsMock(),
      error: new ApiError(401, 'Missing management session'),
    });

    render(<ReviewsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('reviews.sessionExpired'));
    expect(screen.getByRole('link', { name: t('auth.logout.continueToLogin') })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a forbidden-specific state when review queries return forbidden', () => {
    useReviewsMock.mockReturnValue({
      ...useReviewsMock(),
      error: new ApiError(403, 'Forbidden'),
    });

    render(<ReviewsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent(t('reviews.sessionForbidden'));
  });

  it('filters the review queue by submission provenance', async () => {
    const user = userEvent.setup();

    render(<ReviewsPage />);

    await user.click(screen.getByRole('button', { name: t('reviews.filters.agentOnly') }));

    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Publish research.search capability')).toBeInTheDocument();
    expect(screen.getByText('Register OpenAI production key')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t('reviews.filters.tokenOnly') }));

    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Publish research.search capability')).toBeInTheDocument();
    expect(screen.queryByText('Register OpenAI production key')).not.toBeInTheDocument();
  });

  it('filters the review queue by resource kind and surfaces provenance metrics', async () => {
    const user = userEvent.setup();

    render(<ReviewsPage />);

    expect(
      screen.getByText(t('reviews.filters.agentSubmissions', { count: 2 }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(t('reviews.filters.tokenOriginated', { count: 1 }))
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: t('assets.metrics.capabilities') }));

    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByText('Publish research.search capability')).toBeInTheDocument();
    expect(screen.queryByText('Register OpenAI production key')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        t('reviews.item.submittedByLine', { actorType: 'agent', actorId: 'bootstrap' })
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('token-bootstrap').length).toBeGreaterThan(0);
  });

  it('prefilters by resource kind and highlights the focused review item', () => {
    mockSearchParams = new URLSearchParams('resourceKind=capability&resourceId=capability-1');

    render(<ReviewsPage />);

    expect(screen.getByText(t('reviews.focusedItem'))).toBeInTheDocument();
    expect(screen.queryByText('Approve Sync Config')).not.toBeInTheDocument();
    expect(screen.getByTestId('review-card-capability-capability-1')).toHaveAttribute(
      'data-focus-state',
      'focused'
    );
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
    expect(screen.getByText(t('governance.status.approved'))).toBeInTheDocument();
    expect(screen.getByText(t('governance.status.rejected'))).toBeInTheDocument();
  });

  it('localizes the reviewer role badge instead of leaking the raw enum', () => {
    render(<ReviewsPage />);

    expect(screen.getByText(t('settings.roles.owner'))).toBeInTheDocument();
    expect(screen.queryByText(/^owner$/)).not.toBeInTheDocument();
  });
});
