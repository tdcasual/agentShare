import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocsContent } from './docs-content';

describe('DocsContent', () => {
  it('uses the current Vault Secret list endpoint in the quick start', () => {
    render(<DocsContent />);

    const example = screen.getByText(/curl -H/);
    expect(example).toHaveTextContent(
      'curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/vault/secrets'
    );
    expect(example).not.toHaveTextContent(/\/api\/vault\s*$/);
  });
});
