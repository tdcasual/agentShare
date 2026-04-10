'use client';

import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface PWAUpdatePromptProps {
  className?: string;
}

export function PWAUpdatePrompt({ className }: PWAUpdatePromptProps) {
  const { t } = useI18n();
  const { hasUpdate, update, dismissUpdate } = usePWA();

  if (!hasUpdate) {
    return null;
  }

  return (
    <Card
      className={cn(
        'fixed left-4 right-4 top-4 z-50 md:left-auto md:right-4 md:w-96',
        'animate-slide-down border-l-4 border-l-[var(--kw-primary-500)] shadow-xl',
        className
      )}
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--kw-primary-100)] dark:bg-[var(--kw-dark-pink-surface)]">
            <RefreshCw className="h-5 w-5 text-[var(--kw-primary-500)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--kw-text)]">{t('pwa.newVersionTitle')}</h3>
            <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
              {t('pwa.newVersionDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissUpdate}
            className="rounded-lg p-1 transition-colors hover:bg-[var(--kw-surface-alt)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
            aria-label={t('pwa.dismiss')}
          >
            <X className="h-5 w-5 text-[var(--kw-text-muted)]" />
          </button>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={dismissUpdate} className="flex-1">
            {t('pwa.later')}
          </Button>
          <Button
            size="sm"
            onClick={update}
            className="flex-1"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {t('pwa.updateNow')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// 离线提示
interface PWAOfflineIndicatorProps {
  className?: string;
}

export function PWAOfflineIndicator({ className }: PWAOfflineIndicatorProps) {
  const { t } = useI18n();
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-50',
        'bg-[var(--kw-warning)] px-4 py-2 text-center text-white',
        'text-sm font-medium',
        'animate-fade-in',
        className
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        {t('pwa.offlineIndicator')}
      </span>
    </div>
  );
}
