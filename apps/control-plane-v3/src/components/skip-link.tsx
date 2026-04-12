'use client';

import { useI18n } from '@/components/i18n-provider';

export function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-skip focus:rounded-lg focus:bg-[var(--kw-primary-500)] focus:px-4 focus:py-2 focus:text-white"
    >
      {t('common.skipToContent')}
    </a>
  );
}
