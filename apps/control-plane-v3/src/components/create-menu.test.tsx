import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateMenu } from './create-menu';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/hooks/use-focus-trap', () => ({
  useFocusTrap: () => ({
    containerRef: createRef<HTMLDivElement>(),
  }),
}));

vi.mock('@/hooks/use-role', () => ({
  useRole: () => ({
    role: 'admin',
    isLoading: false,
  }),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'createMenu.ariaLabel': 'Create menu',
        'createMenu.buttonLabel': 'Create',
        'createMenu.title': 'Create resources',
        'createMenu.closeAriaLabel': 'Close create menu',
        'createMenu.searchPlaceholder': 'Search actions',
        'createMenu.searchAriaLabel': 'Search create actions',
        'createMenu.sections.identity': 'Identity',
        'createMenu.sections.resource': 'Resource',
        'createMenu.sections.system': 'System',
        'createMenu.actions.agent': 'Create agent',
        'createMenu.actions.agentDesc': 'Create an agent',
        'createMenu.actions.operator': 'Create operator',
        'createMenu.actions.operatorDesc': 'Create an operator',
        'createMenu.actions.token': 'Create token',
        'createMenu.actions.tokenDesc': 'Create a token',
        'createMenu.actions.space': 'Create space',
        'createMenu.actions.spaceDesc': 'Create a space',
        'createMenu.actions.setting': 'Open settings',
        'createMenu.actions.settingDesc': 'Configure the system',
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('CreateMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses dialog semantics for the searchable create palette', () => {
    render(<CreateMenu />);

    const trigger = screen.getByRole('button', { name: 'Create menu' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');

    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Create menu' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
