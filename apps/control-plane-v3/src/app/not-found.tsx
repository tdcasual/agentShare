'use client';

import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n-provider';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <main
      id="main-content"
      className="flex min-h-screen items-center justify-center bg-background p-4"
    >
      <div className="w-full max-w-md space-y-6 p-8 text-center">
        <div className="text-muted-foreground" aria-hidden="true">
          <Search className="mx-auto h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {t('common.pageNotFoundTitle') || 'Page Not Found'}
          </h1>
          <p className="text-muted-foreground">
            {t('common.pageNotFoundDescription') || 'The page you are looking for does not exist.'}
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('common.backToHome') || 'Back to Home'}
          </Link>
        </Button>
      </div>
    </main>
  );
}
