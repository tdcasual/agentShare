import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AgentsPage from './page';

vi.mock('@/domains/agent', () => ({
  useAgents: () => ({
    agents: [{ id: 'agent-1', name: 'Deploy Agent', description: 'Production', status: 'active' }],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
  createAgent: vi.fn(),
}));

describe('AgentsPage', () => {
  it('renders agents and the create action', () => {
    render(<AgentsPage />);
    expect(screen.getByText('Deploy Agent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agents\.new/i })).toBeInTheDocument();
  });
});
