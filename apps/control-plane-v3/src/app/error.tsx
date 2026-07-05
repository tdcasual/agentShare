'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <div className="flex justify-center" aria-hidden="true">
          <AlertTriangle className="h-16 w-16 text-warning" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {t('common.unexpectedErrorTitle')}
          </h1>
          <p className="text-muted-foreground">{t('common.unexpectedErrorDescription')}</p>
        </div>
        <Button onClick={reset} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('common.retry')}
        </Button>
      </div>
    </div>
  );
}
