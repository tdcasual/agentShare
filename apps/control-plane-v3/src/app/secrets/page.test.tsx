import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecretsPage from './page';

const mockRefresh = vi.fn();

// Mock the domain hooks
vi.mock('@/domains/secret', () => ({
  useSecrets: vi.fn(() => ({
    secrets: [
      {
        id: '1',
        name: 'OpenAI Key',
        type: 'api_key',
        url: 'https://api.openai.com',
        username: '',
        tags: ['prod'],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        user_id: 'u1',
        metadata: {},
      },
      {
        id: '2',
        name: 'GitHub Token',
        type: 'bearer_token',
        url: '',
        username: 'user',
        tags: [],
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        user_id: 'u1',
        metadata: {},
      },
    ],
    isLoading: false,
    error: null,
    refresh: mockRefresh,
  })),
  createSecret: vi.fn(),
  deleteSecret: vi.fn(),
}));

vi.mock('@/domains/token', () => ({
  useTokens: () => ({
    tokens: [],
    isLoading: false,
  }),
}));

describe('SecretsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<SecretsPage />);
    expect(screen.getByText('secrets.title')).toBeInTheDocument();
  });

  it('displays secret list', () => {
    render(<SecretsPage />);
    expect(screen.getByText('OpenAI Key')).toBeInTheDocument();
    expect(screen.getByText('GitHub Token')).toBeInTheDocument();
  });

  it('displays secret type badges', () => {
    render(<SecretsPage />);
    expect(screen.getByText('api_key')).toBeInTheDocument();
    expect(screen.getByText('bearer_token')).toBeInTheDocument();
  });

  it('displays tags', () => {
    render(<SecretsPage />);
    expect(screen.getByText(/prod/)).toBeInTheDocument();
  });
});
