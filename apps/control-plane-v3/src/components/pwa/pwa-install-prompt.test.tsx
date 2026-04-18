import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PWAInstallPrompt } from './pwa-install-prompt';

vi.mock('@/hooks/use-pwa', () => ({
  usePWA: () => ({
    isInstallable: true,
    isInstalled: false,
    install: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/components/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === 'pwa.installTitle') {
        return 'Install app';
      }
      if (key === 'pwa.installDesc') {
        return 'Add the app to your device';
      }
      if (key === 'pwa.dismiss') {
        return 'Dismiss';
      }
      if (key === 'pwa.later') {
        return 'Later';
      }
      if (key === 'pwa.install') {
        return 'Install';
      }
      if (key === 'pwa.installApp') {
        return 'Install app';
      }
      return key;
    },
  }),
}));

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('re-shows immediately when a stored dismissal has already expired', async () => {
    localStorage.setItem('pwa-install-dismissed', String(Date.now() - 1000));

    render(<PWAInstallPrompt delay={0} minVisits={1} />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText('Install app')).toBeInTheDocument();
  });
});
