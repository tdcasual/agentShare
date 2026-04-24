import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { translateMessage } from '@/test-utils/i18n-mock';
import DocsPage from './page';

const t = translateMessage;

const usePublicDocsMock = vi.fn();
const usePublicDocMock = vi.fn();
const refreshPublicDocsMock = vi.fn();

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    locale: 'en',
    t: translateMessage,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/domains/docs', () => ({
  usePublicDocs: () => usePublicDocsMock(),
  usePublicDoc: (_category: string | null, _filename: string | null) => usePublicDocMock(),
  refreshPublicDocs: () => refreshPublicDocsMock(),
}));

describe('docs page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    usePublicDocsMock.mockReturnValue({
      docs: [
        { category: 'guides', filename: 'getting-started.md', title: 'Getting Started', summary: 'First steps' },
        { category: 'guides', filename: 'advanced.md', title: 'Advanced', summary: 'Deep dive' },
        { category: 'api', filename: 'endpoints.md', title: 'API Endpoints', summary: 'Reference' },
      ],
      isLoading: false,
      error: null,
    });

    usePublicDocMock.mockReturnValue({
      data: { category: 'guides', filename: 'getting-started.md', title: 'Getting Started', content: '# Hello' },
      isLoading: false,
      error: null,
    });
  });

  it('renders docs list with categories', async () => {
    render(<DocsPage />);

    expect(screen.getByText(t('docs.title'))).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('API Endpoints')).toBeInTheDocument();
  });

  it('renders a public docs entry without management identity chrome', () => {
    render(<DocsPage />);

    expect(screen.queryByText(t('common.operator'))).not.toBeInTheDocument();
  });

  it('renders the docs content inside the shared main-content anchor target', () => {
    render(<DocsPage />);

    expect(document.querySelector('main#main-content')).not.toBeNull();
  });

  it('filters by search query', async () => {
    const user = userEvent.setup();
    render(<DocsPage />);

    await user.type(screen.getByPlaceholderText(t('docs.searchPlaceholder')), 'api');

    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
    expect(screen.getByText('API Endpoints')).toBeInTheDocument();
  });

  it('filters by category', async () => {
    const user = userEvent.setup();
    render(<DocsPage />);

    await user.click(screen.getByRole('button', { name: 'api' }));

    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
    expect(screen.getByText('API Endpoints')).toBeInTheDocument();
  });

  it('opens doc detail modal on click', async () => {
    const user = userEvent.setup();
    render(<DocsPage />);

    await user.click(screen.getByText('Getting Started'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('shows empty state when no docs', () => {
    usePublicDocsMock.mockReturnValue({ docs: [], isLoading: false, error: null });
    render(<DocsPage />);

    expect(screen.getByText(t('docs.empty'))).toBeInTheDocument();
  });

  it('shows loading state', () => {
    usePublicDocsMock.mockReturnValue({ docs: [], isLoading: true, error: null });
    render(<DocsPage />);

    expect(screen.getByText(t('docs.loading'))).toBeInTheDocument();
  });

  it('shows error state and retry', async () => {
    refreshPublicDocsMock.mockResolvedValue(undefined);
    usePublicDocsMock.mockReturnValue({
      docs: [],
      isLoading: false,
      error: new Error('network error'),
    });

    render(<DocsPage />);

    expect(screen.getByText('network error')).toBeInTheDocument();
  });
});
