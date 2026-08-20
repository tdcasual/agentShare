import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentToken, Secret } from '@/lib/vaultgate-api';
import { TokenAccessPanel } from './agent-token-workspace';

const EMPTY_SECRET_IDS: string[] = [];

vi.mock('@/domains/agent', () => ({
  // secretIds 必须保持引用稳定：组件的同步 effect 依赖它，
  // 每次渲染返回新数组会造成 setSelected 死循环。
  useTokenGrants: () => ({ secretIds: EMPTY_SECRET_IDS, error: undefined, isLoading: false }),
  rotateToken: vi.fn(),
  revokeToken: vi.fn(),
  saveGrants: vi.fn(),
}));

const secret = {
  id: 'secret-1',
  name: 'Production database',
  type: 'password',
  url: null,
  documentation_url: null,
  username: null,
  description: null,
  tags: [],
  metadata: {},
  space_id: null,
  created_by_agent_id: null,
  version: 1,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
} as Secret;

vi.mock('@/domains/secret', () => ({
  useSecrets: () => ({ secrets: [secret], total: 1, error: undefined, isLoading: false }),
}));

const baseProps = {
  agentId: 'agent-1',
  onIssued: vi.fn(),
  onChanged: vi.fn(),
  onDirtyChange: vi.fn(),
};

function buildToken(status: AgentToken['status']): AgentToken {
  return {
    id: 'token-1',
    name: 'CI Token',
    status,
    key_prefix: 'vg_ci',
    description: null,
    expires_at: null,
    last_used_at: null,
  } as AgentToken;
}

describe('TokenAccessPanel', () => {
  it('disables grant editing when the selected token is revoked', () => {
    render(<TokenAccessPanel token={buildToken('revoked')} {...baseProps} />);

    expect(screen.getByText('agents.grantsDisabledRevoked')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Production database/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'agents.selectPage' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'agents.clearSelection' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'agents.saveAccess' })).toBeDisabled();
    // Backend rejects rotate for revoked tokens, so the action is disabled up front.
    expect(screen.getByRole('button', { name: 'agents.rotate' })).toBeDisabled();
  });

  it('keeps grant editing enabled when the selected token is active', () => {
    render(<TokenAccessPanel token={buildToken('active')} {...baseProps} />);

    expect(screen.queryByText('agents.grantsDisabledRevoked')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Production database/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'agents.selectPage' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'agents.clearSelection' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'agents.rotate' })).toBeEnabled();
  });
});
