import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Secret } from '@/lib/vaultgate-api';
import { SecretEditorDialog } from './secret-editor-dialog';

const createSecretMock = vi.fn();
const updateSecretMock = vi.fn();

vi.mock('@/domains/secret', () => ({
  createSecret: (...args: unknown[]) => createSecretMock(...args),
  updateSecret: (...args: unknown[]) => updateSecretMock(...args),
}));

const secret: Secret = {
  id: 'secret-1',
  name: 'Production database',
  type: 'password',
  url: null,
  documentation_url: null,
  username: 'deploy',
  description: 'Primary database account',
  tags: ['production'],
  metadata: {},
  space_id: null,
  created_by_agent_id: null,
  version: 1,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
};

describe('SecretEditorDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateSecretMock.mockResolvedValue(secret);
  });

  it('does not overwrite the stored value when an edit leaves value blank', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SecretEditorDialog open secret={secret} onOpenChange={vi.fn()} onSaved={onSaved} />);

    const name = screen.getByLabelText('secrets.createForm.name');
    await user.clear(name);
    await user.type(name, 'Production database v2');
    await user.click(screen.getByRole('button', { name: 'secrets.saveChanges' }));

    await waitFor(() => {
      expect(updateSecretMock).toHaveBeenCalledWith(
        'secret-1',
        expect.not.objectContaining({ value: expect.anything() })
      );
    });
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('sends null when optional fields are cleared during an edit', async () => {
    const user = userEvent.setup();
    render(<SecretEditorDialog open secret={secret} onOpenChange={vi.fn()} onSaved={vi.fn()} />);

    await user.clear(screen.getByLabelText('secrets.createForm.username'));
    await user.clear(screen.getByLabelText('secrets.createForm.description'));
    await user.click(screen.getByRole('button', { name: 'secrets.saveChanges' }));

    await waitFor(() => {
      expect(updateSecretMock).toHaveBeenCalledWith(
        'secret-1',
        expect.objectContaining({ username: null, description: null, url: null })
      );
    });
  });
});
