'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function DocsContent() {
  const { t } = useI18n();
  // 挂载前为 null：SSR/首帧渲染骨架，避免假 origin 闪一下再替换
  const [origin, setOrigin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const command = `curl --fail-with-body \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  "${origin ?? ''}/api/vault/secrets"`;

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="border-b pb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/">
            <ArrowLeft />
            {t('common.backToHome')}
          </Link>
        </Button>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          VaultGate Runtime API
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {t('docs.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('docs.subtitle')}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('docs.quickStart')}</h2>
        <ol className="divide-y border-y">
          <DocStep
            number="01"
            title={t('docs.createSecretTitle')}
            description={t('docs.step1')}
            href="/secrets"
          />
          <DocStep
            number="02"
            title={t('docs.issueTokenTitle')}
            description={t('docs.step2')}
            href="/agents"
          />
          <DocStep number="03" title={t('docs.callApiTitle')} description={t('docs.step3')} />
        </ol>
        <div className="relative overflow-hidden rounded-lg border bg-muted text-foreground">
          <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
            <span>shell</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(command);
                  setCopied(true);
                  setCopyError(false);
                  toast.success(t('common.copySuccess'));
                } catch {
                  setCopyError(true);
                }
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
          {origin === null ? (
            <div className="p-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <pre
              tabIndex={0}
              aria-label={t('docs.commandLabel')}
              className="overflow-x-auto p-4 text-sm leading-6 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <code>{command}</code>
            </pre>
          )}
        </div>
        {copyError && (
          <p role="alert" className="text-sm text-destructive">
            {t('docs.copyFailed')}
          </p>
        )}
      </section>

      <section className="space-y-4 border-t pt-7">
        <div>
          <h2 className="text-lg font-semibold">{t('docs.apiReference')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('docs.apiReferenceDesc')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="group flex min-h-20 items-center justify-between gap-4 rounded-lg border px-4 py-3 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div>
              <p className="font-medium">{t('docs.swagger')}</p>
              <p className="mt-1 text-xs text-muted-foreground">GET /api/docs</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </a>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="group flex min-h-20 items-center justify-between gap-4 rounded-lg border px-4 py-3 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div>
              <p className="font-medium">{t('docs.openapi')}</p>
              <p className="mt-1 text-xs text-muted-foreground">GET /api/openapi.json</p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </a>
        </div>
      </section>
    </main>
  );
}

function DocStep({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{number}</span>
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {href && <ExternalLink className="ml-auto h-4 w-4 text-muted-foreground" />}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="grid min-h-20 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-4 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3"
        >
          {content}
        </Link>
      ) : (
        <div className="grid min-h-20 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 px-2 py-4 sm:px-3">
          {content}
        </div>
      )}
    </li>
  );
}
