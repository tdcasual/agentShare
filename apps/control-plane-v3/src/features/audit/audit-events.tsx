'use client';

import { CheckCircle2, ChevronDown, Clock3, XCircle } from 'lucide-react';
import type { AuditLog } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

export function AuditMetric({
  label,
  value,
  loading,
  formatter,
  tone,
}: {
  label: string;
  value?: number;
  loading: boolean;
  formatter: Intl.NumberFormat;
  tone?: 'success' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'text-status-success'
      : tone === 'danger'
        ? 'text-status-danger'
        : 'text-foreground';
  return (
    <div className="bg-background p-4 sm:p-5">
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>
        {loading || value === undefined ? '—' : formatter.format(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function AuditTableRow({ log }: { log: AuditLog }) {
  const { t, locale } = useI18n();
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
        {formatAuditDate(log.created_at, locale)}
      </TableCell>
      <TableCell className="max-w-[220px]">
        <span className="block truncate" title={log.actor_label || t('audit.system')}>
          {log.actor_label || t('audit.system')}
        </span>
      </TableCell>
      <TableCell className="max-w-[260px]">
        <span className="block truncate" title={log.resource_label || t('audit.noResource')}>
          {log.resource_label || t('audit.noResource')}
        </span>
      </TableCell>
      <TableCell>{auditActionLabel(log.action, t)}</TableCell>
      <TableCell>
        <AuditResultBadge result={log.result} />
      </TableCell>
      <TableCell className="max-w-[260px]">
        {log.reason || log.request_id ? (
          <dl className="space-y-1 text-xs">
            {log.reason && (
              <div className="truncate" title={log.reason}>
                <dt className="sr-only">{t('audit.reason')}</dt>
                <dd>{log.reason}</dd>
              </div>
            )}
            {log.request_id && (
              <div className="truncate font-mono text-muted-foreground" title={log.request_id}>
                <dt className="sr-only">{t('audit.requestId')}</dt>
                <dd>{log.request_id}</dd>
              </div>
            )}
          </dl>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function AuditEventCard({ log }: { log: AuditLog }) {
  const { t, locale } = useI18n();
  return (
    <article className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{auditActionLabel(log.action, t)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {formatAuditDate(log.created_at, locale)}
          </p>
        </div>
        <AuditResultBadge result={log.result} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-2">
          <dt className="text-muted-foreground">{t('audit.actor')}</dt>
          <dd className="break-words">{log.actor_label || t('audit.system')}</dd>
        </div>
        <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-2">
          <dt className="text-muted-foreground">{t('audit.resource')}</dt>
          <dd className="break-words">{log.resource_label || t('audit.noResource')}</dd>
        </div>
      </dl>
      {(log.reason || log.request_id) && (
        <details className="group mt-3 text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            {t('audit.technicalDetails')}
          </summary>
          <dl className="space-y-2 border-l pl-4 text-xs">
            {log.reason && (
              <div>
                <dt className="text-muted-foreground">{t('audit.reason')}</dt>
                <dd className="mt-1 break-all">{log.reason}</dd>
              </div>
            )}
            {log.request_id && (
              <div>
                <dt className="text-muted-foreground">{t('audit.requestId')}</dt>
                <dd className="mt-1 break-all">{log.request_id}</dd>
              </div>
            )}
          </dl>
        </details>
      )}
    </article>
  );
}

function AuditResultBadge({ result }: { result: AuditLog['result'] }) {
  const { t } = useI18n();
  return result === 'success' ? (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      {t('audit.granted')}
    </Badge>
  ) : (
    <Badge variant="danger" className="gap-1">
      <XCircle className="h-3 w-3" />
      {t('audit.denied')}
    </Badge>
  );
}

export function auditActionLabel(action: string, t: (key: string) => string) {
  const key = `audit.actions.${action.replaceAll('.', '_')}`;
  const translated = t(key);
  return translated === key ? action.replaceAll('.', ' › ') : translated;
}

function formatAuditDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(
    new Date(value)
  );
}

export function AuditSkeleton() {
  return (
    <div className="divide-y border-y">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="grid gap-3 py-4 md:grid-cols-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
      ))}
    </div>
  );
}
