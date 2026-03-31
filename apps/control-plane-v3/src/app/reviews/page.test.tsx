import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import ReviewsPage from './page';

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
});
