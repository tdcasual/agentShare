import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import IdentitiesPage from './page';

const useManagementSessionGateMock = vi.fn();
const useAdminAccountsMock = vi.fn();
const useAgentsMock = vi.fn();
const refreshSessionMock = vi.fn();
const refreshAdminAccountsMock = vi.fn();
const refreshAgentsMock = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/route-guard', () => ({
  ManagementRouteGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/identity', () => ({
  useAdminAccounts: () => useAdminAccountsMock(),
  useAgents: () => useAgentsMock(),
  refreshSession: () => refreshSessionMock(),
  refreshAdminAccounts: () => refreshAdminAccountsMock(),
  refreshAgents: () => refreshAgentsMock(),
}));

describe('identities page', () => {
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
            status: 'inactive',
            created_at: '2026-03-31T00:00:00.000Z',
            updated_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    useAgentsMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'bootstrap',
            name: 'Bootstrap Agent',
            risk_tier: 'high',
            auth_method: 'api_key',
            status: 'active',
            created_at: '2026-03-31T00:00:00.000Z',
            updated_at: '2026-03-31T00:00:00.000Z',
          },
          {
            id: 'analyzer',
            name: 'Analyzer Agent',
            risk_tier: 'medium',
            auth_method: 'oauth',
            status: 'inactive',
            created_at: '2026-03-31T00:00:00.000Z',
            updated_at: '2026-03-31T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it('filters human and agent lists locally from the search query', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    expect(screen.getByText('Alice Operator')).toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search identities/i }), 'analyzer');

    expect(screen.queryByText('Alice Operator')).not.toBeInTheDocument();
    expect(screen.getByText('Analyzer Agent')).toBeInTheDocument();
    expect(screen.getByText(/No human operators match/i)).toBeInTheDocument();
  });

  it('refreshes the management snapshot when refresh is requested', async () => {
    const user = userEvent.setup();
    refreshSessionMock.mockResolvedValue(undefined);
    refreshAdminAccountsMock.mockResolvedValue(undefined);
    refreshAgentsMock.mockResolvedValue(undefined);

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /refresh snapshot/i }));

    await waitFor(() => {
      expect(refreshSessionMock).toHaveBeenCalledTimes(1);
      expect(refreshAdminAccountsMock).toHaveBeenCalledTimes(1);
      expect(refreshAgentsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('offers a retry action when backend loading fails', async () => {
    const user = userEvent.setup();
    refreshSessionMock.mockResolvedValue(undefined);
    refreshAgentsMock.mockResolvedValue(undefined);

    useAgentsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Agents backend unavailable'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Agents backend unavailable');

    await user.click(screen.getByRole('button', { name: /retry agents/i }));

    await waitFor(() => {
      expect(refreshSessionMock).not.toHaveBeenCalled();
      expect(refreshAdminAccountsMock).not.toHaveBeenCalled();
      expect(refreshAgentsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the healthy section visible when only agent data fails', async () => {
    useAgentsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Agents backend unavailable'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByText('Founding Owner')).toBeInTheDocument();
    expect(screen.getByText(/Agent data is temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Bootstrap Agent')).not.toBeInTheDocument();
  });

  it('reveals operator details when the details toggle is expanded', async () => {
    const user = userEvent.setup();

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /view details for founding owner/i }));

    expect(screen.getByText('Account ID')).toBeInTheDocument();
    expect(screen.getByText('admin-owner')).toBeInTheDocument();
    expect(screen.getByText('Never signed in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide details for founding owner/i })).toBeInTheDocument();
  });

  it('shows a relogin recovery state when refresh hits an expired session', async () => {
    const user = userEvent.setup();
    refreshSessionMock.mockRejectedValue(new ApiError(401, 'Missing management session'));

    render(<IdentitiesPage />);

    await user.click(screen.getByRole('button', { name: /refresh snapshot/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });

  it('shows a relogin recovery state when backend queries return unauthorized', () => {
    useAgentsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new ApiError(401, 'Missing management session'),
    });

    render(<IdentitiesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Your management session has expired');
    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute('href', '/login');
  });
});
