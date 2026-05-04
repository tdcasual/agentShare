'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { createCoreRuntime, initializeRuntime, RuntimeContext } from '@/core/runtime';
import { IdentityDomainPlugin } from '@/domains/identity/plugin';
import { useI18n } from '@/components/i18n-provider';
import { Loader2 } from 'lucide-react';

interface RuntimeProviderProps {
  children: React.ReactNode;
}

export function RuntimeProvider({ children }: RuntimeProviderProps) {
  const { t } = useI18n();
  const [runtime, setRuntime] = useState<ReturnType<typeof createCoreRuntime> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const rt = createCoreRuntime({
          plugins: [new IdentityDomainPlugin()],
        });

        await initializeRuntime(rt);

        if (mounted) {
          setRuntime(rt);
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('初始化运行环境失败'));
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-[var(--kw-bg)] p-4 dark:bg-[var(--kw-dark-bg)]"
      >
        <div className="w-full max-w-md rounded-xl border border-[var(--kw-border)] bg-[var(--kw-surface)] p-8 text-center shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
          <h1 className="mb-2 text-xl font-bold text-[var(--kw-text)]">
            {t('runtime.initFailedTitle')}
          </h1>
          <p className="text-[var(--kw-text)]">{error.message}</p>
        </div>
      </main>
    );
  }

  if (!isReady || !runtime) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center justify-center bg-[var(--kw-bg)] dark:bg-[var(--kw-dark-bg)]"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--kw-primary-500)]" />
          <p className="text-[var(--kw-text)]">{t('runtime.initializing')}</p>
        </div>
      </main>
    );
  }

  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}
