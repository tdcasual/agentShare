import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaginationControls } from './pagination-controls';

describe('PaginationControls', () => {
  it('exposes accessible previous and next controls', () => {
    const onOffsetChange = vi.fn();
    render(
      <PaginationControls offset={25} limit={25} total={73} onOffsetChange={onOffsetChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.next' }));

    expect(onOffsetChange).toHaveBeenNthCalledWith(1, 0);
    expect(onOffsetChange).toHaveBeenNthCalledWith(2, 50);
    expect(screen.getByText('26–50 common.of 73')).toBeInTheDocument();
  });
});
