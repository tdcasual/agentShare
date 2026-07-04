import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuditPage from './page';

// Mock the domain hooks
vi.mock('@/domains/audit', () => ({
  useAuditLogs: () => ({
    logs: [
      {
        id: '1',
        timestamp: '2026-01-01T12:00:00Z',
        token_id: 'tok_123',
        secret_id: 'sec_456',
        action: 'read_value',
        granted: true,
        requested_field_count: 1,
      },
      {
        id: '2',
        timestamp: '2026-01-01T13:00:00Z',
        token_id: 'tok_789',
        secret_id: 'sec_012',
        action: 'read_value',
        granted: false,
        requested_field_count: 1,
      },
    ],
    total: 2,
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
    expect(screen.getByText('audit.time')).toBeInTheDocument();
    expect(screen.getByText('audit.token')).toBeInTheDocument();
    expect(screen.getByText('audit.secret')).toBeInTheDocument();
    expect(screen.getByText('audit.action')).toBeInTheDocument();
    expect(screen.getByText('audit.status')).toBeInTheDocument();
  });

  it('displays stats section', () => {
    render(<AuditPage />);
    expect(screen.getByText('audit.totalEvents')).toBeInTheDocument();
    expect(screen.getByText('audit.valueReads')).toBeInTheDocument();
  });
});
