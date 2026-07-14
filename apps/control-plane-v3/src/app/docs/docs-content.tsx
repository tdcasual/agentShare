'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

export function DocsContent() {
  const { t } = useI18n();

  return (
    <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t('docs.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('docs.subtitle')}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.backToHome')}
          </Link>
        </Button>
      </div>

      {/* API Reference */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('docs.apiReference')}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('docs.apiReferenceDesc')}</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs">GET /api/docs</code>
            <span>— {t('docs.swagger')}</span>
          </li>
          <li className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
              GET /api/openapi.json
            </code>
            <span>— {t('docs.openapi')}</span>
          </li>
        </ul>
      </Card>

      {/* Quick Start */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('docs.quickStart')}</h2>
        <div className="space-y-4 text-sm text-muted-foreground">
          <ol className="list-inside list-decimal space-y-2">
            <li>
              <strong>{t('dashboard.title')}</strong> {t('docs.step1')}
            </li>
            <li>
              <strong>{t('agents.title')}</strong> {t('docs.step2')}
            </li>
            <li>
              {t('docs.step3')}
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
                curl -H &quot;Authorization: Bearer YOUR_TOKEN&quot;
                http://localhost:8000/api/vault/secrets
              </pre>
            </li>
          </ol>
        </div>
      </Card>
    </main>
  );
}
