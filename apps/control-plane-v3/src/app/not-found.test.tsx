import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { translateMessage } from '@/test-utils/i18n-mock';
import NotFound from './not-found';

vi.mock('@/hooks/use-role', () => ({
  useRole: () => ({
    role: 'viewer',
    isLoading: false,
  }),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: translateMessage,
  }),
}));

describe('not found page', () => {
  it('renders a single home link instead of nested interactive controls', () => {
    render(<NotFound />);

    const homeLink = screen.getByRole('link', {
      name: translateMessage('common.backToHome'),
    });

    expect(homeLink).toHaveAttribute('href', '/playbooks');
    expect(screen.queryByRole('button', { name: translateMessage('common.backToHome') })).toBeNull();
  });
});
