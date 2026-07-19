import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteGuard } from './route-guard';

const replaceMock = vi.fn();
const resolveAppEntryStateMock = vi.fn();
const pathnameMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/lib/session', () => ({
  resolveAppEntryState: (...args: unknown[]) => resolveAppEntryStateMock(...args),
  useManagementSessionGate: vi.fn(),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('RouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathnameMock.mockReturnValue('/login');
  });

  it('redirects authenticated admins from login to the application', async () => {
    resolveAppEntryStateMock.mockResolvedValue({
      kind: 'authenticated',
      session: {
        email: 'admin@example.com',
        id: 'admin-1',
        auth_type: 'session',
      },
    });

    render(
      <RouteGuard>
        <div>content</div>
      </RouteGuard>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/');
    });
  });

  it('redirects login to setup before VaultGate is initialized', async () => {
    resolveAppEntryStateMock.mockResolvedValue({ kind: 'setup_required' });

    render(
      <RouteGuard>
        <div>login</div>
      </RouteGuard>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/setup');
    });
  });

  it('allows anonymous users to stay on public docs routes', async () => {
    pathnameMock.mockReturnValue('/docs');

    render(
      <RouteGuard>
        <div>public docs</div>
      </RouteGuard>
    );

    expect(await screen.findByText('public docs')).toBeInTheDocument();
    expect(resolveAppEntryStateMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders public docs without resolving backend state', async () => {
    pathnameMock.mockReturnValue('/docs/runtime');
    resolveAppEntryStateMock.mockRejectedValue(new Error('API unavailable'));

    render(
      <RouteGuard>
        <div>public docs while offline</div>
      </RouteGuard>
    );

    expect(await screen.findByText('public docs while offline')).toBeInTheDocument();
    expect(resolveAppEntryStateMock).not.toHaveBeenCalled();
    expect(screen.queryByText('common.serviceUnavailable')).not.toBeInTheDocument();
  });

  it('renders the full-screen loader instead of children while the entry state is unresolved', () => {
    pathnameMock.mockReturnValue('/secrets');
    resolveAppEntryStateMock.mockReturnValue(new Promise(() => {}));

    render(
      <RouteGuard>
        <div>protected content</div>
      </RouteGuard>
    );

    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByText('common.initializing')).toBeInTheDocument();
  });

  it('does not redirect on stale entry state after client-side navigation', async () => {
    resolveAppEntryStateMock
      .mockResolvedValueOnce({ kind: 'anonymous' })
      // Re-resolution for the next path never settles within this test.
      .mockReturnValueOnce(new Promise(() => {}));

    pathnameMock.mockReturnValue('/login');
    const { rerender } = render(
      <RouteGuard>
        <div>login page</div>
      </RouteGuard>
    );

    // The anonymous state for /login is applied: the public page renders.
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();

    // Client-side navigation to a protected page (e.g. router.push('/') after login).
    pathnameMock.mockReturnValue('/');
    rerender(
      <RouteGuard>
        <div>home page</div>
      </RouteGuard>
    );

    await waitFor(() => {
      expect(resolveAppEntryStateMock).toHaveBeenCalledTimes(2);
    });

    // The stale anonymous state must not bounce the user back to /login,
    // and the unresolved page shows the loader instead of flashing content.
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
    expect(screen.getByText('common.initializing')).toBeInTheDocument();
  });

  it('keeps rendering protected pages without a full-screen loader during authenticated navigation', async () => {
    resolveAppEntryStateMock
      .mockResolvedValueOnce({
        kind: 'authenticated',
        session: { email: 'admin@example.com', id: 'admin-1', auth_type: 'session' },
      })
      // Silent revalidation for the next path never settles within this test.
      .mockReturnValueOnce(new Promise(() => {}));

    pathnameMock.mockReturnValue('/secrets');
    const { rerender } = render(
      <RouteGuard>
        <div>secrets content</div>
      </RouteGuard>
    );

    expect(await screen.findByText('secrets content')).toBeInTheDocument();

    // Authenticated SPA navigation must render instantly without the full-screen loader.
    pathnameMock.mockReturnValue('/agents');
    rerender(
      <RouteGuard>
        <div>agents content</div>
      </RouteGuard>
    );

    await waitFor(() => {
      expect(resolveAppEntryStateMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText('agents content')).toBeInTheDocument();
    expect(screen.queryByText('common.initializing')).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('renders persistent navigation on authenticated application pages', async () => {
    pathnameMock.mockReturnValue('/secrets');
    resolveAppEntryStateMock.mockResolvedValue({
      kind: 'authenticated',
      session: { email: 'admin@example.com', id: 'admin-1', auth_type: 'session' },
    });

    render(
      <RouteGuard>
        <div>protected content</div>
      </RouteGuard>
    );

    const desktopNavigation = await screen.findByRole('navigation', { name: 'navigation.label' });
    expect(desktopNavigation).toBeInTheDocument();
    expect(
      within(desktopNavigation).getByRole('link', { name: 'navigation.dashboard' })
    ).toHaveAttribute('href', '/');
    expect(
      within(desktopNavigation).getByRole('link', { name: 'navigation.secrets' })
    ).toHaveAttribute('aria-current', 'page');
  });
});
