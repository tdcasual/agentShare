import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/components/i18n-provider';
import type { SpaceMembership, VaultSpace } from '@/lib/vaultgate-api';
import SpacesPage from './page';

const replaceMock = vi.fn();
const saveMembersMock = vi.fn();
const spaces: VaultSpace[] = [
  { id: 'space-a', name: 'Production', description: null, status: 'active' } as VaultSpace,
  { id: 'space-b', name: 'Staging', description: null, status: 'active' } as VaultSpace,
];
const members: SpaceMembership[] = [];
let tokenPage = 0;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/domains/space', () => ({
  createSpace: vi.fn(async () => spaces[1]),
  removeSpace: vi.fn(),
  saveSpaceMemberships: (...args: unknown[]) => saveMembersMock(...args),
  updateSpace: vi.fn(),
  useSpaces: () => ({ spaces, isLoading: false, error: undefined, refresh: vi.fn() }),
  useSpaceMemberships: () => ({
    members,
    isLoading: false,
    error: undefined,
  }),
  useAllAgentTokens: () => ({
    tokens:
      tokenPage === 0
        ? [
            {
              id: 'token-a',
              agent_name: 'Deploy',
              name: 'Production',
              key_prefix: 'vg_prod',
              status: 'active',
            },
          ]
        : [
            {
              id: 'token-b',
              agent_name: 'Deploy',
              name: 'Staging',
              key_prefix: 'vg_stage',
              status: 'active',
            },
          ],
    total: 51,
    isLoading: false,
    error: undefined,
    data: { items: [], total: 51 },
  }),
}));

function renderPage() {
  return render(
    <I18nProvider initialLocale="en">
      <SpacesPage />
    </I18nProvider>
  );
}

describe('SpacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenPage = 0;
  });

  it('confirms before switching spaces with unsaved members', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox', { name: /Production/ }));
    fireEvent.click(screen.getByRole('button', { name: /Staging/ }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Discard unsaved member settings?'
    );
    expect(screen.getByRole('button', { name: /ProductionActive/, hidden: true })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('keeps the member draft while paging through token options', async () => {
    const { rerender } = renderPage();
    fireEvent.click(await screen.findByRole('checkbox', { name: /Production/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    tokenPage = 1;
    rerender(
      <I18nProvider initialLocale="en">
        <SpacesPage />
      </I18nProvider>
    );

    expect(await screen.findByRole('checkbox', { name: /Deploy\/Staging/ })).toBeInTheDocument();
    expect(screen.getByText('Member settings are not saved')).toBeInTheDocument();
    expect(saveMembersMock).not.toHaveBeenCalled();
  });

  it('guards same-origin navigation while the member draft is dirty', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('checkbox', { name: /Production/ }));
    const link = document.createElement('a');
    link.href = '/agents';
    document.body.appendChild(link);
    fireEvent.click(link);
    link.remove();

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Changing spaces or leaving this page'
    );
    expect(replaceMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Discard changes' })).toBeVisible()
    );
  });
});
