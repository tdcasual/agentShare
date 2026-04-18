import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoader } from './page-loader';

describe('PageLoader', () => {
  it('applies non-fullscreen minHeight via inline style', () => {
    render(<PageLoader message="Loading tasks" minHeight="42vh" />);

    const message = screen.getByText('Loading tasks');
    const container = message.parentElement?.parentElement;

    expect(container).not.toBeNull();
    expect(container).toHaveStyle({ minHeight: '42vh' });
  });
});
