import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Card } from '../card';

describe('Card', () => {
  it('renders content without forced region role', () => {
    render(<Card>Summary</Card>);

    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders as an interactive button when clickable', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Actionable</Card>);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
