import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocsContent } from './docs-content';

describe('DocsContent', () => {
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
});
