import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NotFound from './not-found';

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('not found page', () => {
  it('renders a single home link instead of nested interactive controls', () => {
    render(<NotFound />);

    const homeLink = screen.getByRole('link', {
      name: /common\.backToHome/,
    });

    expect(homeLink).toHaveAttribute('href', '/');
    expect(
      screen.queryByRole('button', { name: 'common.backToHome' })
    ).toBeNull();
  });
});
