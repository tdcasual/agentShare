import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import ApprovalsPage from './page';

const useManagementSessionGateMock = vi.fn();
const useApprovalsMock = vi.fn();
const useApprovalActionsMock = vi.fn();
const approveMock = vi.fn();
const rejectMock = vi.fn();
const refreshApprovalsMock = vi.fn();

vi.mock('@/components/route-guard', () => ({
  ManagementRouteGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/approval/hooks', () => ({
  useApprovals: (...args: unknown[]) => useApprovalsMock(...args),
  useApprovalActions: () => useApprovalActionsMock(),
}));

describe('approvals page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useManagementSessionGateMock.mockReturnValue({
      session: { email: 'operator@example.com', role: 'operator' },
      loading: false,
      error: null,
    });
    useApprovalsMock.mockReturnValue({
      approvals: [
        {
          id: 'approval-1',
          capabilityId: 'capability-1',
          agentId: 'agent-1',
          status: 'pending',
          actionType: 'invoke',
          taskId: 'task-1',
          reason: 'Need elevated access',
          policyReason: 'Requires operator confirmation',
          policySource: 'policy.runtime.invoke',
          requestedBy: 'agent-1',
          decidedBy: null,
          expiresAt: null,
        },
      ],
      total: 1,
      isLoading: false,
      error: null,
      refresh: refreshApprovalsMock,
    });
    refreshApprovalsMock.mockResolvedValue(undefined);
    approveMock.mockResolvedValue({ status: 'approved' });
    rejectMock.mockResolvedValue({ status: 'rejected' });
    useApprovalActionsMock.mockReturnValue({
      approve: approveMock,
      reject: rejectMock,
      isProcessing: false,
    });
  });

  it('renders the approvals page with pending review data', () => {
    render(<ApprovalsPage />);

    expect(screen.getByRole('heading', { name: /approvals.title/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /common.refresh/i })).toBeInTheDocument();
  });

  it('shows a forbidden-specific state when approval queries return forbidden', () => {
    useApprovalsMock.mockReturnValue({
      approvals: [],
      total: 0,
      isLoading: false,
      error: new ApiError(403, 'Forbidden'),
      refresh: vi.fn(),
    });

    render(<ApprovalsPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('approvals.sessionForbidden');
  });

  it('approves a pending request from the approvals list', async () => {
    const user = userEvent.setup();

    render(<ApprovalsPage />);

    await user.click(screen.getAllByRole('button', { name: /^common.approve$/i })[0]);

    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith('approval-1');
    });
  });

  it('rejects a pending request with an operator-provided reason', async () => {
    const user = userEvent.setup();

    render(<ApprovalsPage />);

    await user.click(screen.getAllByRole('button', { name: /^common.reject$/i })[0]);
    await user.type(
      screen.getByPlaceholderText('approvals.rejectReasonPlaceholder'),
      'Policy denied for this request'
    );
    await user.click(screen.getByRole('button', { name: /^approvals.confirmReject$/i }));

    await waitFor(() => {
      expect(rejectMock).toHaveBeenCalledWith('approval-1', {
        reason: 'Policy denied for this request',
      });
    });
  });

  it('shows an action error when approving a request fails', async () => {
    const user = userEvent.setup();
    approveMock.mockRejectedValueOnce(new Error('Approval service unavailable'));

    render(<ApprovalsPage />);

    await user.click(screen.getAllByRole('button', { name: /^common.approve$/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Approval service unavailable');
    });
  });

  it('shows a relogin recovery state when an approval action hits an expired session', async () => {
    const user = userEvent.setup();
    approveMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<ApprovalsPage />);

    await user.click(screen.getAllByRole('button', { name: /^common.approve$/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('approvals.sessionExpired');
    });

    expect(screen.getByRole('link', { name: 'auth.logout.continueToLogin' })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when refreshing approvals hits an expired session', async () => {
    const user = userEvent.setup();
    refreshApprovalsMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<ApprovalsPage />);

    await user.click(screen.getByRole('button', { name: /common.refresh/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('approvals.sessionExpired');
    });
  });

  it('shows a refresh error when approvals refresh fails for a non-auth reason', async () => {
    const user = userEvent.setup();
    refreshApprovalsMock.mockRejectedValueOnce(new Error('Approval refresh unavailable'));

    render(<ApprovalsPage />);

    await user.click(screen.getByRole('button', { name: /common.refresh/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Approval refresh unavailable');
    });
  });
});
