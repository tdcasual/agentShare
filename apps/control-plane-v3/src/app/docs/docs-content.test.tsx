import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocsContent } from './docs-content';

describe('DocsContent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the current Vault Secret list endpoint in the quick start', () => {
    render(<DocsContent />);

    const example = screen.getByText(/curl --fail-with-body/);
    expect(example).toHaveTextContent('Authorization: Bearer YOUR_TOKEN');
    expect(example).toHaveTextContent('/api/vault/secrets');
    expect(example).not.toHaveTextContent('localhost:8000');
    expect(example).not.toHaveTextContent(/\/api\/vault\s*$/);
  });

  it('points API references at the API namespace', () => {
    render(<DocsContent />);

    expect(screen.getByText('GET /api/docs')).toBeInTheDocument();
    expect(screen.getByText('GET /api/openapi.json')).toBeInTheDocument();
    expect(screen.queryByText('GET /openapi.json')).not.toBeInTheDocument();
  });

  it('makes the horizontally scrollable command keyboard focusable', () => {
    render(<DocsContent />);

    const command = screen.getByLabelText('docs.commandLabel');
    expect(command).toHaveAttribute('tabindex', '0');
  });

  it('reports clipboard failures without claiming the command was copied', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<DocsContent />);

    await user.click(screen.getByRole('button', { name: 'common.copy' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('docs.copyFailed');
    expect(screen.queryByText('common.copied')).not.toBeInTheDocument();
  });
});
