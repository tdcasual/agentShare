import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRole } from '@/hooks/use-role';
import { useRoleStore } from '@/store/role-store';

const useManagementSessionGateMock = vi.fn();

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: (...args: unknown[]) => useManagementSessionGateMock(...args),
}));

function RoleProbe() {
  const { role, isLoading, isAdmin, hasRole } = useRole();

  return (
    <div>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="is-admin">{String(isAdmin)}</span>
      <span data-testid="has-viewer">{String(hasRole('viewer'))}</span>
    </div>
  );
}

describe('useRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoleStore.setState({ role: null, lastUpdated: null });
  });

  it('does not expose a persisted role while the session is still loading', () => {
    useRoleStore.getState().setRole('admin');
    useManagementSessionGateMock.mockReturnValue({
      session: null,
      loading: true,
      refreshSession: vi.fn(),
    });

    render(<RoleProbe />);

    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('has-viewer')).toHaveTextContent('false');
  });

  it('clears the persisted role after the session resolves as anonymous', async () => {
    useRoleStore.getState().setRole('admin');
    useManagementSessionGateMock.mockReturnValue({
      session: null,
      loading: false,
      refreshSession: vi.fn(),
    });

    render(<RoleProbe />);

    await waitFor(() => {
      expect(useRoleStore.getState().role).toBeNull();
    });
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });
});
