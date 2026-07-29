import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsNavigation } from './settings-navigation';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/security',
}));

describe('SettingsNavigation', () => {
  it('links both settings areas and marks the current page', () => {
    render(<SettingsNavigation />);

    expect(screen.getByRole('link', { name: 'settings.navigation.security' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.getByRole('link', { name: 'settings.navigation.managementTokens' })
    ).toHaveAttribute('href', '/settings/management-tokens');
  });
});
