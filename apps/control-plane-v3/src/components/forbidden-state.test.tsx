import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenState } from './forbidden-state';

const pushMock = vi.fn();
const backMock = vi.fn();
const useRoleMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    back: backMock,
  }),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          'common.back': 'Back',
          'common.backToHome': 'Back to home',
          'forbiddenState.title': 'Forbidden',
          'forbiddenState.noPermission': 'You do not have permission.',
          'forbiddenState.noPermissionWithResource': 'You do not have permission for {resource}.',
          'forbiddenState.currentRole': 'Current role',
          'forbiddenState.requiredRole': 'Required role',
          'forbiddenState.notLoggedIn': 'Not signed in',
          'forbiddenState.contactAdmin': 'Contact an administrator.',
          'settings.roles.viewer': 'Viewer',
          'settings.roles.admin': 'Admin',
          'settings.roles.owner': 'Owner',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

vi.mock('@/hooks/use-role', () => ({
  useRole: () => useRoleMock(),
}));

describe('ForbiddenState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRoleMock.mockReturnValue({
      role: 'viewer',
      isLoading: false,
    });
  });

  it('routes lower-privilege users back to an allowed default page', async () => {
    const user = userEvent.setup();

    render(<ForbiddenState requiredRole="admin" />);

    expect(screen.getByText(/Current role:/)).toHaveTextContent('Current role: Viewer');
    expect(screen.getByText(/Required role:/)).toHaveTextContent('Required role: Admin');
    expect(screen.queryByText('观察者')).not.toBeInTheDocument();
    expect(screen.queryByText('管理员')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to home' }));

    expect(pushMock).toHaveBeenCalledWith('/playbooks');
  });
});
