'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';
import { useRole } from '@/hooks/use-role';
import { getDefaultManagementRoute } from '@/lib/role-system';
import { emojiCombo } from '@/lib/kawaii-emojis';

export default function NotFound() {
  const { t } = useI18n();
  const { role } = useRole();
  const homeTarget = getDefaultManagementRoute(role);

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-[var(--kw-bg)] p-4 dark:bg-[var(--kw-dark-bg)]"
    >
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-primary-50)] text-3xl dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]"
          aria-hidden="true"
        >
          {emojiCombo('notFound', 1)}
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--kw-text)] sm:text-2xl">
            {t('common.pageNotFoundTitle')}
          </h1>
          <p className="text-[var(--kw-text-muted)]">{t('common.pageNotFoundDescription')}</p>
        </div>
        <Link
          href={homeTarget}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[var(--kw-primary-500)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--kw-primary-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2"
        >
          {emojiCombo('back', 1)} {t('common.backToHome')}
        </Link>
      </div>
    </main>
  );
}
