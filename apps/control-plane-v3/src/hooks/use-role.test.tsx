import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRole } from '@/hooks/use-role';
import { useRoleStore } from '@/store/role-store';

let mockGlobalSession: {
  state: string;
  email?: string;
  role?: string;
  sessionId?: string;
  error?: string;
  lastLoadedAt?: number;
};

vi.mock('@/lib/session-state', () => ({
  useGlobalSession: () => mockGlobalSession,
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
    useRoleStore.setState({ role: null });
    mockGlobalSession = { state: 'unknown', lastLoadedAt: Date.now() };
  });

  it('does not expose a persisted role while the session is still loading', () => {
    useRoleStore.getState().setRole('admin');
    mockGlobalSession = { state: 'unknown', lastLoadedAt: Date.now() };

    render(<RoleProbe />);

    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
    expect(screen.getByTestId('has-viewer')).toHaveTextContent('false');
  });

  it('clears the persisted role after the session resolves as anonymous', async () => {
    useRoleStore.getState().setRole('admin');
    mockGlobalSession = { state: 'anonymous', lastLoadedAt: Date.now() };

    render(<RoleProbe />);

    await waitFor(() => {
      expect(useRoleStore.getState().role).toBeNull();
    });
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });

  it('exposes the role from global session when authenticated', () => {
    mockGlobalSession = {
      state: 'authenticated',
      email: 'admin@test.com',
      role: 'admin',
      sessionId: 'sess-1',
      lastLoadedAt: Date.now(),
    };

    render(<RoleProbe />);

    expect(screen.getByTestId('role')).toHaveTextContent('admin');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
    expect(screen.getByTestId('has-viewer')).toHaveTextContent('true');
  });
});
