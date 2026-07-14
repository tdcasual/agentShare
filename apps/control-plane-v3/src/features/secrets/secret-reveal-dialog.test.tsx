import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  username: null,
  description: null,
  tags: [],
  metadata: {},
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('SecretRevealDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revealSecretMock.mockResolvedValue('super-secret-value');
  });

  it('loads plaintext only after the reveal dialog is opened', async () => {
    render(<SecretRevealDialog secret={secret} open onOpenChange={vi.fn()} />);

    expect(await screen.findByText('super-secret-value')).toBeInTheDocument();
    expect(revealSecretMock).toHaveBeenCalledWith('secret-1');
    expect(screen.getByText('secrets.revealDescription')).toBeInTheDocument();
  });
});
