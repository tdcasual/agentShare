import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from './proxy';

describe('nonce content security policy', () => {
  it('allows only nonced inline scripts in production', () => {
    const policy = buildContentSecurityPolicy('testnonce', false);

    expect(policy).toContain("script-src 'self' 'nonce-testnonce' 'strict-dynamic'");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'nonce-testnonce'");
    expect(policy).toContain("'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
  });

  it('does not upgrade subresources when serving a production build over HTTP', () => {
    const policy = buildContentSecurityPolicy('testnonce', false, false);

    expect(policy).not.toContain('upgrade-insecure-requests');
  });

  it('permits the development evaluator without weakening inline scripts', () => {
    const policy = buildContentSecurityPolicy('devnonce', true);

    expect(policy).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});
