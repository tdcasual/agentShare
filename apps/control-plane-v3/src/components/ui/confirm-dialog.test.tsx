import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete?"
        message="This cannot be undone"
      />
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders title, message, and action buttons when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete?"
        message="This cannot be undone"
        confirmText="Yes, delete"
        cancelText="Cancel"
      />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} confirmText="Confirm" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} cancelText="Cancel" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons while loading', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isLoading={true}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('ignores a same-frame double click on the confirm button', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} confirmText="Confirm" />
    );
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('re-enables the confirm button after the dialog closes and reopens', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} confirmText="Confirm" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={onConfirm} confirmText="Confirm" />
    );
    rerender(
      <ConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} confirmText="Confirm" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('re-enables the confirm button when a failed action stops loading', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <ConfirmDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} confirmText="Confirm" />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    // Parent starts async work, then fails and keeps the dialog open.
    rerender(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        confirmText="Confirm"
        isLoading={true}
      />
    );
    rerender(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        confirmText="Confirm"
        isLoading={false}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it('releases the buttons via watchdog when loading never settles', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        confirmText="Confirm"
        isLoading={true}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeDisabled();

    // isLoading stuck true past the 40s watchdog: the dialog unlocks for retry.
    act(() => {
      vi.advanceTimersByTime(39_000);
    });
    expect(confirmButton).toBeDisabled();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
