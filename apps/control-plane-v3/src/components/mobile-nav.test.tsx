import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileNav } from './mobile-nav';

const useRoleMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/reviews',
}));

vi.mock('@/hooks/use-device-type', () => ({
  useIsMobile: () => true,
}));

vi.mock('@/hooks/use-role', () => ({
  useRole: () => useRoleMock(),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        'common.more': 'More',
        'common.closeNavigationMenu': 'Close navigation menu',
        'navigation.hub': 'Hub',
        'navigation.inbox': 'Inbox',
        'navigation.reviews': 'Reviews',
        'navigation.approvals': 'Approvals',
        'navigation.marketplace': 'Marketplace',
        'navigation.playbooks': 'Playbooks',
        'navigation.runs': 'Runs',
        'navigation.spaces': 'Spaces',
        'navigation.identities': 'Identities',
        'navigation.assets': 'Assets',
        'navigation.tokens': 'Tokens',
        'navigation.tasks': 'Tasks',
        'navigation.settings': 'Settings',
      };
      return messages[key] ?? key;
    },
  }),
}));

describe('MobileNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoleMock.mockReturnValue({ role: 'admin' });
  });

  it('exposes the More sheet as a dialog instead of a menu trigger', () => {
    render(<MobileNav />);

    const moreButton = screen.getByRole('button', { name: 'More' });
    expect(moreButton).toHaveAttribute('aria-haspopup', 'dialog');

    fireEvent.click(moreButton);

    expect(screen.getByRole('dialog', { name: 'More' })).toBeInTheDocument();
  });

  it('does not render a dead-end More action for viewer sessions', () => {
    useRoleMock.mockReturnValue({ role: 'viewer' });

    render(<MobileNav />);

    expect(screen.getByRole('link', { name: 'Playbooks' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Runs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Spaces' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument();
  });
});
