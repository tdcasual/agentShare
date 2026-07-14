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

  it('redirects authenticated lower-role users from login to their role-safe landing page', async () => {
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

  it('allows anonymous users to stay on public docs routes', async () => {
    pathnameMock.mockReturnValue('/docs');
    resolveAppEntryStateMock.mockResolvedValue({
      kind: 'anonymous',
    });

    render(
      <RouteGuard>
        <div>public docs</div>
      </RouteGuard>
    );

    await waitFor(() => {
      expect(resolveAppEntryStateMock).toHaveBeenCalled();
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('allows public docs routes even before bootstrap is completed', async () => {
    pathnameMock.mockReturnValue('/docs');
    resolveAppEntryStateMock.mockResolvedValue({
      kind: 'setup_required',
    });

    render(
      <RouteGuard>
        <div>public docs before bootstrap</div>
      </RouteGuard>
    );

    await waitFor(() => {
      expect(resolveAppEntryStateMock).toHaveBeenCalled();
    });

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
