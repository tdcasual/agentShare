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
    stats: { total: 100, granted: 88, denied: 10, value_reads: 24 },
    isLoading: false,
    error: null,
  }),
}));

describe('VaultGateDashboard', () => {
  it('renders the dashboard title', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.title')).toBeInTheDocument();
  });

  it('renders primary workflow links', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.createSecret')).toBeInTheDocument();
    expect(screen.getByText('dashboard.workflowAgents')).toBeInTheDocument();
    expect(screen.getByText('dashboard.workflowAudit')).toBeInTheDocument();
  });

  it('renders the configuration path', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.setupPath')).toBeInTheDocument();
  });

  it('renders the 24 hour activity summary', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.activity24h')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('uses server totals instead of the current page length', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('73')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
  });
});
