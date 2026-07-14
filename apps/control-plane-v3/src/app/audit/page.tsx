'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useAuditLogs, useAuditStats } from '@/domains/audit';
import type { AuditLog, AuditQuery } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PaginationControls } from '@/components/ui/pagination-controls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PAGE_SIZE = 50;
const ACTIONS = [
  'secret.value.read',
  'secret.metadata.read',
  'secret.create',
  'secret.update',
  'secret.delete',
  'agent.create',
  'agent.update',
  'agent.enable',
  'agent.disable',
  'token.issue',
  'token.rotate',
  'token.revoke',
  'token.grants.replace',
  'admin.login',
  'admin.logout',
] as const;

export default function AuditPage() {
  const { t, locale } = useI18n();
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<'all' | 'success' | 'denied'>('all');
  const [action, setAction] = useState('all');
  const [actorSearch, setActorSearch] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const deferredActor = useDeferredValue(actorSearch.trim());
  const deferredResource = useDeferredValue(resourceSearch.trim());

  const query = useMemo<AuditQuery>(
    () => ({
      limit: PAGE_SIZE,
      offset,
      result: result === 'all' ? undefined : result,
      action: action === 'all' ? undefined : action,
      actor_search: deferredActor || undefined,
      resource_search: deferredResource || undefined,
      created_from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
      created_to: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
    }),
    [action, dateFrom, dateTo, deferredActor, deferredResource, offset, result]
  );

  const { logs, total, isLoading, error, refresh } = useAuditLogs(query);
  const { stats, isLoading: statsLoading } = useAuditStats();
  const filtered =
    result !== 'all' || action !== 'all' || actorSearch || resourceSearch || dateFrom || dateTo;
  const number = new Intl.NumberFormat(locale);

  function resetFilters() {
    setResult('all');
    setAction('all');
    setActorSearch('');
    setResourceSearch('');
    setDateFrom('');
    setDateTo('');
    setOffset(0);
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="border-b pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          VaultGate
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {t('audit.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('audit.description')}</p>
      </header>

      <section aria-label={t('audit.summary')} className="grid grid-cols-2 border-y sm:grid-cols-4">
        <AuditMetric
          label={t('audit.totalEvents')}
          value={stats?.total}
          loading={statsLoading}
          formatter={number}
        />
        <AuditMetric
          label={t('audit.grantedAccess')}
          value={stats?.granted}
          loading={statsLoading}
          formatter={number}
          tone="success"
        />
        <AuditMetric
          label={t('audit.deniedAccess')}
          value={stats?.denied}
          loading={statsLoading}
          formatter={number}
          tone="danger"
        />
        <AuditMetric
          label={t('audit.valueReads')}
          value={stats?.value_reads}
          loading={statsLoading}
          formatter={number}
        />
      </section>

      <section aria-labelledby="audit-filter-heading" className="space-y-4 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="audit-filter-heading" className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            {t('audit.filters')}
          </h2>
          {filtered && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t('audit.clearFilters')}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={t('audit.resultFilter')}>
          {(['all', 'success', 'denied'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={result === value}
              onClick={() => {
                setResult(value);
                setOffset(0);
              }}
              className={`min-h-11 rounded-md border px-4 text-sm font-medium transition-colors ${
                result === value
                  ? value === 'denied'
                    ? 'border-status-danger bg-status-danger-subtle text-status-danger-subtle-foreground'
                    : value === 'success'
                      ? 'border-status-success bg-status-success-subtle text-status-success-subtle-foreground'
                      : 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {t(
                value === 'all'
                  ? 'audit.all'
                  : value === 'success'
                    ? 'audit.granted'
                    : 'audit.denied'
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="audit-actor">{t('audit.actor')}</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="audit-actor"
                value={actorSearch}
                onChange={(event) => {
                  setActorSearch(event.target.value);
                  setOffset(0);
                }}
                className="pl-10"
                placeholder={t('audit.actorPlaceholder')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-resource">{t('audit.resource')}</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="audit-resource"
                value={resourceSearch}
                onChange={(event) => {
                  setResourceSearch(event.target.value);
                  setOffset(0);
                }}
                className="pl-10"
                placeholder={t('audit.resourcePlaceholder')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-action">{t('audit.action')}</Label>
            <Select
              value={action}
              onValueChange={(value) => {
                setAction(value);
                setOffset(0);
              }}
            >
              <SelectTrigger id="audit-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit.allActions')}</SelectItem>
                {ACTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {actionLabel(value, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="audit-from">{t('audit.from')}</Label>
              <Input
                id="audit-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-to">{t('audit.to')}</Label>
              <Input
                id="audit-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setOffset(0);
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-live="polite" aria-busy={isLoading} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t('audit.events')}</h2>
          <span className="text-sm tabular-nums text-muted-foreground">
            {t('audit.resultCount', { count: total })}
          </span>
        </div>
        {isLoading ? (
          <AuditSkeleton />
        ) : error ? (
          <EmptyState
            title={t('audit.loadFailed')}
            description={error.message}
            icon={<ShieldAlert className="h-6 w-6" />}
            action={
              <Button variant="outline" onClick={() => void refresh()}>
                {t('common.retry')}
              </Button>
            }
            className="border-y"
          />
        ) : logs.length === 0 ? (
          <EmptyState
            title={t(filtered ? 'audit.noResultsTitle' : 'audit.emptyTitle')}
            description={t(filtered ? 'audit.noResultsDesc' : 'audit.emptyDesc')}
            icon={<ShieldAlert className="h-6 w-6" />}
            action={
              filtered ? (
                <Button variant="outline" onClick={resetFilters}>
                  {t('audit.clearFilters')}
                </Button>
              ) : undefined
            }
            className="border-y"
          />
        ) : (
          <>
            <div className="hidden overflow-hidden border-y md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('audit.time')}</TableHead>
                    <TableHead>{t('audit.actor')}</TableHead>
                    <TableHead>{t('audit.resource')}</TableHead>
                    <TableHead>{t('audit.action')}</TableHead>
                    <TableHead>{t('audit.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <AuditTableRow key={log.id} log={log} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="divide-y border-y md:hidden">
              {logs.map((log) => (
                <AuditEventCard key={log.id} log={log} />
              ))}
            </div>
          </>
        )}
      </section>
      <PaginationControls
        offset={offset}
        limit={PAGE_SIZE}
        total={total}
        onOffsetChange={setOffset}
      />
    </main>
  );
}

function AuditMetric({
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
    <div className="border-r p-4 last:border-r-0 sm:p-5">
      <p className={`text-2xl font-semibold tabular-nums ${color}`}>
        {loading ? '—' : formatter.format(value ?? 0)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AuditTableRow({ log }: { log: AuditLog }) {
  const { t, locale } = useI18n();
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
        {formatDate(log.created_at, locale)}
      </TableCell>
      <TableCell className="max-w-[220px] truncate">
        {log.actor_label || t('audit.system')}
      </TableCell>
      <TableCell className="max-w-[260px] truncate">
        {log.resource_label || t('audit.noResource')}
      </TableCell>
      <TableCell>{actionLabel(log.action, t)}</TableCell>
      <TableCell>
        <ResultBadge result={log.result} />
      </TableCell>
    </TableRow>
  );
}

function AuditEventCard({ log }: { log: AuditLog }) {
  const { t, locale } = useI18n();
  return (
    <article className="py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{actionLabel(log.action, t)}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDate(log.created_at, locale)}
          </p>
        </div>
        <ResultBadge result={log.result} />
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
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-muted-foreground">
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

function ResultBadge({ result }: { result: AuditLog['result'] }) {
  const { t } = useI18n();
  return result === 'success' ? (
    <Badge className="gap-1 bg-status-success-subtle text-status-success-subtle-foreground hover:bg-status-success-subtle">
      <CheckCircle2 className="h-3 w-3" />
      {t('audit.granted')}
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      {t('audit.denied')}
    </Badge>
  );
}

function actionLabel(action: string, t: (key: string) => string) {
  const key = `audit.actions.${action.replaceAll('.', '_')}`;
  const translated = t(key);
  return translated === key ? action.replaceAll('.', ' › ') : translated;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(
    new Date(value)
  );
}

function AuditSkeleton() {
  return (
    <div className="divide-y border-y">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="grid gap-3 py-4 md:grid-cols-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
