import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManagementSessionExpiredAlert } from './management-session-recovery';

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) =>
      key === 'auth.logout.continueToLogin' ? 'Continue to login (localized)' : key,
  }),
}));

describe('ManagementSessionExpiredAlert', () => {
  it('localizes the relogin CTA label', () => {
    render(<ManagementSessionExpiredAlert message="Session expired" />);

    expect(screen.getByRole('link', { name: 'Continue to login (localized)' })).toHaveAttribute(
      'href',
      '/login'
    );
  });
});
