'use client';

import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-[var(--kw-bg)] p-4 dark:bg-[var(--kw-dark-bg)]"
    >
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-primary-50)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]"
          aria-hidden="true"
        >
          <Search className="h-8 w-8 text-[var(--kw-primary-500)]" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-[var(--kw-text)] sm:text-2xl">
            {t('common.pageNotFoundTitle') || 'Page Not Found'}
          </h1>
          <p className="text-[var(--kw-text-muted)]">
            {t('common.pageNotFoundDescription') || 'The page you are looking for does not exist.'}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[var(--kw-primary-500)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--kw-primary-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('common.backToHome') || 'Back to Home'}
        </Link>
      </div>
    </main>
  );
}
