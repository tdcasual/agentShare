import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Secret } from '@/lib/vaultgate-api';
import { SecretRevealDialog } from './secret-reveal-dialog';

const revealSecretMock = vi.fn();

vi.mock('@/domains/secret', () => ({
  revealSecret: (...args: unknown[]) => revealSecretMock(...args),
}));

const secret: Secret = {
  id: 'secret-1',
  name: 'Production database',
  type: 'password',
  url: null,
  documentation_url: null,
  username: null,
  description: null,
  tags: [],
  metadata: {},
  space_id: null,
  created_by_agent_id: null,
  version: 1,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('SecretRevealDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revealSecretMock.mockResolvedValue('super-secret-value');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads plaintext only after the reveal dialog is opened', async () => {
    render(<SecretRevealDialog secret={secret} open onOpenChange={vi.fn()} />);

    expect(await screen.findByText('super-secret-value')).toBeInTheDocument();
    expect(screen.getByLabelText('secrets.revealedValue')).toHaveAttribute('tabindex', '0');
    expect(revealSecretMock).toHaveBeenCalledWith('secret-1');
    expect(screen.getByText('secrets.revealDescription')).toBeInTheDocument();
  });

  it('keeps the plaintext visible when clipboard copy fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({
      writeText: vi.fn().mockRejectedValue(new Error('denied')),
    } as Pick<Clipboard, 'writeText'> as Clipboard);
    render(<SecretRevealDialog secret={secret} open onOpenChange={vi.fn()} />);

    expect(await screen.findByText('super-secret-value')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'common.copy' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('secrets.copyFailed');
    expect(screen.getByText('super-secret-value')).toBeInTheDocument();
  });

  it('does not restart the auto-hide countdown when onOpenChange identity changes', async () => {
    vi.useFakeTimers();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <SecretRevealDialog secret={secret} open onOpenChange={onOpenChange} />
    );

    // Flush the reveal promise so the countdown starts.
    await act(async () => {});
    expect(screen.getByText('super-secret-value')).toBeInTheDocument();

    // Re-render with a fresh inline closure every 500ms (what the parent page
    // does on each render). REVEAL_SECONDS is 30, so 62 half-second ticks
    // (31s) must still auto-close the dialog exactly once.
    for (let i = 0; i < 62; i += 1) {
      rerender(
        <SecretRevealDialog secret={secret} open onOpenChange={() => onOpenChange(false)} />
      );
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }

    expect(onOpenChange).toHaveBeenCalledTimes(1);
  });
});
