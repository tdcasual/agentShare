import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Agent, AgentToken } from '@/lib/vaultgate-api';
import AgentDetailPage from './[agentId]/page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ agentId: 'agent-1' }),
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => '/agents/agent-1',
  useSearchParams: () => new URLSearchParams(),
}));

const activeAgent = {
  id: 'agent-1',
  name: 'Agent One',
  description: null,
  status: 'active',
} as Agent;

const tokenA = { id: 'token-a', name: 'Token A' } as AgentToken;
const tokenB = { id: 'token-b', name: 'Token B' } as AgentToken;

interface AgentState {
  agent: Agent | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

let agentState: AgentState;
let allTokens: AgentToken[];
let tokensPending: boolean;

vi.mock('@/domains/agent', () => ({
  useAgent: () => ({ ...agentState, refresh: vi.fn() }),
  useAgentTokens: (_agentId: string, query: { limit: number; offset: number }) => {
    if (tokensPending) {
      return {
        tokens: [],
        total: 0,
        data: undefined,
        isLoading: true,
        error: undefined,
        refresh: vi.fn(),
      };
    }
    const items = allTokens.slice(query.offset, query.offset + query.limit);
    return {
      tokens: items,
      total: allTokens.length,
      data: { items, total: allTokens.length },
      isLoading: false,
      error: undefined,
      refresh: vi.fn(),
    };
  },
  issueToken: vi.fn(),
  setAgentStatus: vi.fn(),
}));

vi.mock('@/features/agents/agent-token-workspace', () => ({
  AgentDetailSkeleton: () => <div>agent skeleton</div>,
  OneTimeToken: () => null,
  TokenWorkspaceSkeleton: () => <div>tokens skeleton</div>,
  TokenListItem: ({
    token,
    selected,
    onSelect,
  }: {
    token: AgentToken;
    selected: boolean;
    onSelect: () => void;
  }) => (
    <button type="button" aria-pressed={selected} onClick={onSelect}>
      {token.name}
    </button>
  ),
  TokenAccessPanel: ({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) => (
    <button type="button" onClick={() => onDirtyChange(true)}>
      mark grants dirty
    </button>
  ),
}));

describe('AgentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentState = { agent: activeAgent, isLoading: false, error: undefined };
    allTokens = [tokenA, tokenB];
    tokensPending = false;
  });

  it('keeps the selected token while the token list revalidates', async () => {
    const { rerender } = render(<AgentDetailPage />);

    // The first token is selected once the list has loaded.
    expect(await screen.findByRole('button', { name: 'Token A' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Token B' }));
    expect(screen.getByRole('button', { name: 'Token B' })).toHaveAttribute('aria-pressed', 'true');

    // SWR key change (paging/refresh): data is undefined mid-flight.
    tokensPending = true;
    rerender(<AgentDetailPage />);

    // The fresh page arrives with the same tokens.
    tokensPending = false;
    rerender(<AgentDetailPage />);

    // The user's selection survives the revalidation instead of snapping to the first token.
    expect(screen.getByRole('button', { name: 'Token B' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('steps back one page when the last token of the final page is revoked', async () => {
    allTokens = Array.from({ length: 26 }, (_, index) => ({
      id: `token-${index + 1}`,
      name: `Token ${String(index + 1).padStart(2, '0')}`,
    })) as AgentToken[];

    const { rerender } = render(<AgentDetailPage />);

    // Go to page 2, which holds only Token 26.
    fireEvent.click(await screen.findByRole('button', { name: 'common.next' }));
    expect(await screen.findByRole('button', { name: 'Token 26' })).toBeInTheDocument();

    // Revoking Token 26 empties the final page.
    allTokens = allTokens.slice(0, 25);
    rerender(<AgentDetailPage />);

    // The offset self-corrects back to page 1 instead of stranding on an empty state.
    expect(await screen.findByRole('button', { name: 'Token 01' })).toBeInTheDocument();
  });

  it('disables token issuance for a disabled agent', async () => {
    agentState = {
      agent: { ...activeAgent, status: 'disabled' } as Agent,
      isLoading: false,
      error: undefined,
    };

    render(<AgentDetailPage />);

    expect(await screen.findByText('agents.issueTokenDisabledAgent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'agents.issueToken' })).toBeDisabled();
  });

  it('confirms before discarding unsaved grants on same-origin navigation', async () => {
    render(<AgentDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'mark grants dirty' }));

    const anchor = document.createElement('a');
    anchor.href = '/agents';
    document.body.appendChild(anchor);
    fireEvent.click(anchor);
    anchor.remove();

    // The navigation is held back behind the discard confirmation.
    expect(await screen.findByText('agents.discardGrantsTitle')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'agents.discardGrants' }));
    expect(pushMock).toHaveBeenCalledWith('/agents');
  });

  it('ignores links that only change the hash of the current page', async () => {
    render(<AgentDetailPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'mark grants dirty' }));

    const anchor = document.createElement('a');
    anchor.href = `${window.location.pathname}${window.location.search}#details`;
    document.body.appendChild(anchor);
    fireEvent.click(anchor);
    anchor.remove();

    // Same-page hash links must not trigger the discard confirmation.
    expect(screen.queryByText('agents.discardGrantsTitle')).not.toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
