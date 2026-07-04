import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-5', 'w-5', 'animate-spin');
  });

  it('supports size variants', () => {
    const { container: sm } = render(<Spinner size="sm" />);
    const { container: lg } = render(<Spinner size="lg" />);
    expect(sm.querySelector('svg')).toHaveClass('h-4', 'w-4');
    expect(lg.querySelector('svg')).toHaveClass('h-6', 'w-6');
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="text-primary" />);
    expect(container.querySelector('svg')).toHaveClass('text-primary');
  });
});
