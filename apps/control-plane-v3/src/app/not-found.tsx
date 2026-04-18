'use client';

import Link from 'next/link';
import { Card } from '@/shared/ui-primitives/card';
import { useI18n } from '@/components/i18n-provider';
import { useRole } from '@/hooks/use-role';
import { getDefaultManagementRoute } from '@/lib/role-system';

export default function NotFound() {
  const { t } = useI18n();
  const { role } = useRole();
  const homeTarget = getDefaultManagementRoute(role);

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] p-4 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]"
    >
      <Card variant="feature" className="w-full max-w-md space-y-6 p-8 text-center">
        <div className="text-6xl" aria-hidden="true">
          🌸
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--kw-text)]">
            {t('common.pageNotFoundTitle')}
          </h1>
          <p className="text-[var(--kw-text-muted)]">{t('common.pageNotFoundDescription')}</p>
        </div>
        <Link
          href={homeTarget}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] px-6 py-3 font-semibold text-white shadow-[var(--kw-primary-300)]/30 transition-shadow transition-transform duration-[var(--kw-duration-fast)] hover:-translate-y-0.5 hover:shadow-[var(--kw-primary-400)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2 active:scale-95 active:translate-y-0"
        >
          {t('common.backToHome')}
        </Link>
      </Card>
    </main>
  );
}
