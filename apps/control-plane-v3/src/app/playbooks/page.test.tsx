import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import PlaybooksPage from './page';

const useManagementSessionGateMock = vi.fn();
const usePlaybooksMock = vi.fn();
const useCreatePlaybookMock = vi.fn();
const createPlaybookMock = vi.fn();
const refreshPlaybooksMock = vi.fn();

vi.mock('@/components/route-guard', () => ({
  ManagementRouteGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/interfaces/human/layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/session', () => ({
  useManagementSessionGate: () => useManagementSessionGateMock(),
}));

vi.mock('@/domains/playbook/hooks', () => ({
  usePlaybooks: (...args: unknown[]) => usePlaybooksMock(...args),
  useCreatePlaybook: () => useCreatePlaybookMock(),
}));

describe('playbooks page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useManagementSessionGateMock.mockReturnValue({
      session: { email: 'viewer@example.com', role: 'viewer' },
      loading: false,
      error: null,
    });
    usePlaybooksMock.mockReturnValue({
      playbooks: [
        {
          id: 'playbook-1',
          title: 'Deploy Edge Worker',
          body: 'Step 1: Open the release checklist.\nStep 2: Verify capability bindings.\nStep 3: Roll traffic gradually.',
          taskType: 'deployment',
          tags: ['urgent', 'release'],
          publicationStatus: 'active',
        },
      ],
      total: 1,
      appliedFilters: {},
      isLoading: false,
      error: null,
      refresh: refreshPlaybooksMock,
    });
    refreshPlaybooksMock.mockResolvedValue(undefined);
    createPlaybookMock.mockResolvedValue({
      id: 'playbook-2',
      title: 'New Playbook',
    });
    useCreatePlaybookMock.mockReturnValue({
      create: createPlaybookMock,
      isCreating: false,
    });
  });

  it('renders the playbooks page with backend playbook data', () => {
    render(<PlaybooksPage />);

    expect(screen.getByRole('heading', { name: /playbooks.title/i })).toBeInTheDocument();
    expect(screen.getByText(/Deploy Edge Worker/i)).toBeInTheDocument();
  });

  it('shows a forbidden-specific state when playbook queries return forbidden', () => {
    usePlaybooksMock.mockReturnValue({
      playbooks: [],
      total: 0,
      appliedFilters: {},
      isLoading: false,
      error: new ApiError(403, 'Forbidden'),
      refresh: vi.fn(),
    });

    render(<PlaybooksPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('playbooks.sessionForbidden');
  });

  it('opens a playbook detail view from the list', async () => {
    const user = userEvent.setup();

    render(<PlaybooksPage />);

    await user.click(screen.getByText('Deploy Edge Worker'));

    expect(screen.getByText(/发布状态: active/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /关闭/i })).toBeInTheDocument();
  });

  it('submits a new playbook from the create modal', async () => {
    const user = userEvent.setup();

    render(<PlaybooksPage />);

    await user.click(screen.getByRole('button', { name: /common.new/i }));
    await user.type(screen.getByPlaceholderText('playbooks.modal.titlePlaceholder'), 'Incident Triage');
    await user.type(
      screen.getByPlaceholderText('playbooks.form.tagsPlaceholder'),
      'incident,backend'
    );
    await user.type(
      screen.getByPlaceholderText('playbooks.modal.bodyPlaceholder'),
      'Inspect alerts, confirm scope, and notify responders.'
    );
    await user.click(screen.getByRole('button', { name: /^common.create$/i }));

    await waitFor(() => {
      expect(createPlaybookMock).toHaveBeenCalledWith({
        title: 'Incident Triage',
        body: 'Inspect alerts, confirm scope, and notify responders.',
        taskType: 'code_review',
        tags: ['incident', 'backend'],
      });
    });
  });

  it('shows an action error when creating a playbook fails', async () => {
    const user = userEvent.setup();
    createPlaybookMock.mockRejectedValueOnce(new Error('Playbook service unavailable'));

    render(<PlaybooksPage />);

    await user.click(screen.getByRole('button', { name: /common.new/i }));
    await user.type(screen.getByPlaceholderText('playbooks.modal.titlePlaceholder'), 'Incident Triage');
    await user.type(
      screen.getByPlaceholderText('playbooks.modal.bodyPlaceholder'),
      'Inspect alerts, confirm scope, and notify responders.'
    );
    await user.click(screen.getByRole('button', { name: /^common.create$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Playbook service unavailable');
    });
  });

  it('shows a relogin recovery state when create playbook hits an expired session', async () => {
    const user = userEvent.setup();
    createPlaybookMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<PlaybooksPage />);

    await user.click(screen.getByRole('button', { name: /common.new/i }));
    await user.type(screen.getByPlaceholderText('playbooks.modal.titlePlaceholder'), 'Incident Triage');
    await user.type(
      screen.getByPlaceholderText('playbooks.modal.bodyPlaceholder'),
      'Inspect alerts, confirm scope, and notify responders.'
    );
    await user.click(screen.getByRole('button', { name: /^common.create$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('playbooks.sessionExpired');
    });

    expect(screen.getByRole('link', { name: /return to login/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows a relogin recovery state when refreshing playbooks hits an expired session', async () => {
    const user = userEvent.setup();
    refreshPlaybooksMock.mockRejectedValueOnce(new ApiError(401, 'Missing management session'));

    render(<PlaybooksPage />);

    await user.click(screen.getByRole('button', { name: /common.refresh/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('playbooks.sessionExpired');
    });
  });

  it('shows a refresh error when playbook refresh fails for a non-auth reason', async () => {
    const user = userEvent.setup();
    refreshPlaybooksMock.mockRejectedValueOnce(new Error('Playbook refresh unavailable'));

    render(<PlaybooksPage />);

    await user.click(screen.getByRole('button', { name: /common.refresh/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Playbook refresh unavailable');
    });
  });
});
