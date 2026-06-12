import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VaultGateDashboard from './page';

// Mock the domain hooks
vi.mock('@/domains/secret', () => ({
  useSecrets: () => ({
    secrets: [
      { id: '1', name: 'Test Key', type: 'api_key', url: '', tags: [], created_at: '2026-01-01' },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/domains/token', () => ({
  useTokens: () => ({
    tokens: [
      { id: '1', name: 'CI Token', status: 'active', key_prefix: 'vg_abc', created_at: '2026-01-01', expires_at: null, last_used_at: null },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/domains/audit', () => ({
  useAuditStats: () => ({
    stats: { recent: 5, total: 100, granted: 90, denied: 10 },
    isLoading: false,
    error: null,
  }),
}));

describe('VaultGateDashboard', () => {
  it('renders the dashboard title', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.title')).toBeInTheDocument();
  });

  it('renders quick action links', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.createSecret')).toBeInTheDocument();
    expect(screen.getByText('dashboard.createToken')).toBeInTheDocument();
    expect(screen.getByText('dashboard.viewAudit')).toBeInTheDocument();
  });

  it('renders browse section', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.browse')).toBeInTheDocument();
  });

  it('renders API reference section', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.apiReference')).toBeInTheDocument();
  });
});
