'use client';

import { PageLoader } from '@/components/kawaii/page-loader';
import { useI18n } from '@/components/i18n-provider';

export default function RootLoading() {
  const { t } = useI18n();
  return <PageLoader fullScreen message={t('common.preparingPage')} />;
}
