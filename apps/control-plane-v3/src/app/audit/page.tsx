'use client';

import { useMemo, useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { useAuditActions, useAuditLogs, useAuditStats } from '@/domains/audit';
import type { AuditQuery } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { InlineAlert } from '@/components/ui/inline-alert';
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
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AuditEventCard,
  AuditMetric,
  AuditSkeleton,
  AuditTableRow,
  auditActionLabel,
} from '@/features/audit/audit-events';
import { useDebouncedValue } from '@/lib/use-debounced-value';

const PAGE_SIZE = 50;
export default function AuditPage() {
  const { t, locale } = useI18n();
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<'all' | 'success' | 'denied'>('all');
  const [action, setAction] = useState('all');
  const [actorSearch, setActorSearch] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const deferredActor = useDebouncedValue(actorSearch.trim());
  const deferredResource = useDebouncedValue(resourceSearch.trim());

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
  const { stats, isLoading: statsLoading, error: statsError } = useAuditStats();
  const { actions, isLoading: actionsLoading, error: actionsError } = useAuditActions();
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
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t('audit.title')}</h1>
        <span className="text-xs tabular-nums text-muted-foreground">
          {t('audit.resultCount', { count: total })}
        </span>
      </header>

      <section aria-label={t('audit.summary')} className="space-y-2">
        {statsError && <InlineAlert>{t('audit.statsLoadFailed')}</InlineAlert>}
        <div className="grid grid-cols-2 gap-px border-y bg-border sm:grid-cols-4">
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
        </div>
      </section>

      <section aria-label={t('audit.filters')} className="space-y-3 border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('audit.resultFilter')}>
            {(['all', 'success', 'denied'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={result === value}
                onClick={() => {
                  setResult(value);
                  setOffset(0);
                }}
                className={`min-h-11 rounded-md border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
          {filtered && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              {t('audit.clearFilters')}
            </Button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="audit-actor">{t('audit.actor')}</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="audit-actor"
                maxLength={255}
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
                maxLength={255}
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
              disabled={actionsLoading || Boolean(actionsError)}
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
                {actions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {auditActionLabel(value, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {actionsLoading && (
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            )}
            {actionsError && (
              <InlineAlert className="px-3 py-2 text-xs">
                {t('audit.actionsLoadFailed')}
              </InlineAlert>
            )}
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

      <section aria-label={t('audit.events')} aria-live="polite" aria-busy={isLoading}>
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
                    <TableHead>{t('audit.technicalDetails')}</TableHead>
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
