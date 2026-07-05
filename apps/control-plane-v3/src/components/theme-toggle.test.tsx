import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimpleThemeToggle } from './theme-toggle';

const useThemeMock = vi.fn();

vi.mock('next-themes', () => ({
  useTheme: () => useThemeMock(),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          'settings.theme.switchToDark': 'Switch to dark mode',
          'settings.theme.switchToLight': 'Switch to light mode',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('SimpleThemeToggle', () => {
  beforeEach(() => {
    useThemeMock.mockReset();
  });

  it('uses localized toggle copy for the compact switcher', async () => {
    useThemeMock.mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });

    render(<SimpleThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
    });
  });
});
