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
    total: 73,
  }),
}));

vi.mock('@/domains/agent', () => ({
  useAgents: () => ({
    agents: [
      {
        id: '1',
        name: 'CI Agent',
        status: 'active',
      },
    ],
    isLoading: false,
    error: null,
    total: 54,
  }),
}));

vi.mock('@/domains/audit', () => ({
  useAuditStats: () => ({
    stats: { total: 100, denied: 10 },
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

  it('uses server totals instead of the current page length', () => {
    render(<VaultGateDashboard />);
    expect(screen.getAllByText('73')).toHaveLength(2);
    expect(screen.getAllByText('54')).toHaveLength(2);
  });
});
