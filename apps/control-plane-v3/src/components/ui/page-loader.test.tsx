import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoader } from './page-loader';

describe('PageLoader', () => {
  it('renders a spinner', () => {
    render(<PageLoader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a message when provided', () => {
    render(<PageLoader message="Loading secrets..." />);
    expect(screen.getByText('Loading secrets...')).toBeInTheDocument();
  });

  it('supports fullScreen mode with large spinner', () => {
    const { container } = render(<PageLoader fullScreen message="Please wait" />);
    expect(container.firstChild).toHaveClass('min-h-screen');
    expect(container.firstChild).toHaveClass('bg-background');
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });
});
