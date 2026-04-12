'use client';

import { useEffect } from 'react';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { useI18n } from '@/components/i18n-provider';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] p-4 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
      <Card variant="feature" className="w-full max-w-md space-y-6 p-8 text-center">
        <div className="text-6xl" aria-hidden="true">💔</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--kw-text)]">{t('common.unexpectedErrorTitle')}</h1>
          <p className="text-[var(--kw-text-muted)]">{t('common.unexpectedErrorDescription')}</p>
        </div>
        <Button onClick={reset} className="w-full">
          {t('common.retry')}
        </Button>
      </Card>
    </div>
  );
}
