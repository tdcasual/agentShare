import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuditPage from './page';

// Mock the domain hooks
vi.mock('@/domains/audit', () => ({
  useAuditLogs: () => ({
    logs: [
      {
        id: '1',
        created_at: '2026-01-01T12:00:00Z',
        actor_label: 'vg_primary',
        resource_label: 'github',
        action: 'secret.value.read',
        result: 'success',
        reason: 'explicit grant',
        request_id: 'request-123',
      },
      {
        id: '2',
        created_at: '2026-01-01T13:00:00Z',
        actor_label: 'vg_fallback',
        resource_label: 'database',
        action: 'secret.value.read',
        result: 'denied',
      },
    ],
    total: 2,
    isLoading: false,
    error: null,
  }),
  useAuditStats: () => ({
    stats: { total: 2, denied: 1, value_reads: 2 },
    isLoading: false,
    error: null,
  }),
  useAuditActions: () => ({
    actions: ['secret.value.read', 'agent_token.issue'],
    isLoading: false,
    error: null,
  }),
}));

describe('AuditPage', () => {
  it('renders the page heading', () => {
    render(<AuditPage />);
    // Use getAllByText since the title appears in multiple places
    const headings = screen.getAllByText('audit.title');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('displays filter buttons', () => {
    render(<AuditPage />);
    expect(screen.getByText('audit.all')).toBeInTheDocument();
    // Use getAllByText since granted/denied appear in both filters and stats
    expect(screen.getAllByText('audit.granted').length).toBeGreaterThan(0);
    expect(screen.getAllByText('audit.denied').length).toBeGreaterThan(0);
  });

  it('displays table headers', () => {
    render(<AuditPage />);
    expect(screen.getByRole('columnheader', { name: 'audit.time' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'audit.actor' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'audit.resource' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'audit.action' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'audit.status' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'audit.technicalDetails' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('explicit grant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('request-123').length).toBeGreaterThan(0);
  });

  it('displays stats section', () => {
    render(<AuditPage />);
    expect(screen.getByText('audit.totalEvents')).toBeInTheDocument();
    expect(screen.getByText('audit.valueReads')).toBeInTheDocument();
    expect(screen.getByText('audit.grantedAccess').parentElement).toHaveTextContent('—');
  });
});
