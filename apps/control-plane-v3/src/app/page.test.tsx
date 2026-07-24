import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VaultGateDashboard from './page';

const refreshSecretsMock = vi.fn();
const refreshAgentsMock = vi.fn();
const swrMutateMock = vi.fn();

vi.mock('swr', () => ({
  mutate: (...args: unknown[]) => swrMutateMock(...args),
}));

interface SecretsState {
  secrets: unknown[];
  total: number;
  isLoading: boolean;
  error: Error | undefined;
  refresh: typeof refreshSecretsMock;
}

interface AgentsState {
  agents: unknown[];
  total: number;
  isLoading: boolean;
  error: Error | undefined;
  refresh: typeof refreshAgentsMock;
}

interface StatsState {
  stats: { total: number; granted: number; denied: number; value_reads: number } | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

let secretsState: SecretsState;
let agentsState: AgentsState;
let statsState: StatsState;

vi.mock('@/domains/secret', () => ({
  useSecrets: () => secretsState,
}));

vi.mock('@/domains/agent', () => ({
  useAgents: () => agentsState,
}));

vi.mock('@/domains/audit', () => ({
  useAuditStats: () => statsState,
}));

describe('VaultGateDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secretsState = {
      secrets: [{ id: '1' }],
      total: 73,
      isLoading: false,
      error: undefined,
      refresh: refreshSecretsMock,
    };
    agentsState = {
      agents: [{ id: '1' }],
      total: 54,
      isLoading: false,
      error: undefined,
      refresh: refreshAgentsMock,
    };
    statsState = {
      stats: { total: 100, granted: 88, denied: 10, value_reads: 24 },
      isLoading: false,
      error: undefined,
    };
  });

  it('renders the dashboard title', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.controlPlane')).toBeInTheDocument();
  });

  it('renders the primary action and audit shortcut', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('dashboard.createSecret')).toBeInTheDocument();
    expect(screen.getByText('dashboard.reviewAudit')).toBeInTheDocument();
  });

  it('renders the 24 hour activity metrics', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('uses server totals instead of the current page length', () => {
    render(<VaultGateDashboard />);
    expect(screen.getByText('73')).toBeInTheDocument();
    expect(screen.getByText('54')).toBeInTheDocument();
  });

  it('shows an honest unknown status with retry when security data fails to load', () => {
    statsState = { stats: undefined, isLoading: false, error: new Error('boom') };

    render(<VaultGateDashboard />);

    // No green "all clear" copy while the stats request failed.
    expect(screen.getByText('dashboard.statusUnknown')).toBeInTheDocument();
    expect(screen.queryByText('dashboard.noDenied')).not.toBeInTheDocument();

    // Failed metrics show a placeholder instead of a misleading zero.
    expect(screen.getByText('dashboard.recentActivity').parentElement).toHaveTextContent('—');

    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refreshSecretsMock).toHaveBeenCalledTimes(1);
    expect(refreshAgentsMock).toHaveBeenCalledTimes(1);
    expect(swrMutateMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/audit-stats'));
  });
});
