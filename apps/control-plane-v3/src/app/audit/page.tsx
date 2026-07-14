'use client';

import { useState } from 'react';
import { useAuditLogs, useAuditStats } from '@/domains/audit';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { PaginationControls } from '@/components/ui/pagination-controls';

const PAGE_SIZE = 50;

export default function AuditPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<{
    action?: string;
    result?: string;
  }>({});
  const [offset, setOffset] = useState(0);

  const { logs, total, isLoading, error } = useAuditLogs({
    limit: PAGE_SIZE,
    offset,
    ...filter,
  });
  const { stats } = useAuditStats();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const isAllActive = !filter.action && !filter.result;
  const isGrantedActive = filter.result === 'success';
  const isDeniedActive = filter.result === 'denied';

  const deniedCount = stats?.denied ?? 0;
  const grantedCount = Math.max(0, (stats?.total ?? 0) - deniedCount);
  const valueReadCount = stats?.value_reads ?? 0;

  return (
    <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t('audit.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('audit.description')}</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t('audit.filters')}</span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('audit.filters')}>
            <button
              type="button"
              aria-pressed={isAllActive}
              onClick={() => {
                setOffset(0);
                setFilter({});
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                isAllActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {t('audit.all')}
            </button>
            <button
              type="button"
              aria-pressed={isGrantedActive}
              onClick={() => {
                setOffset(0);
                setFilter({ result: 'success' });
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                isGrantedActive
                  ? 'bg-status-success-subtle text-status-success-subtle-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {t('audit.granted')}
            </button>
            <button
              type="button"
              aria-pressed={isDeniedActive}
              onClick={() => {
                setOffset(0);
                setFilter({ result: 'denied' });
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                isDeniedActive
                  ? 'bg-status-danger-subtle text-status-danger-subtle-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {t('audit.denied')}
            </button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-foreground">{stats?.total ?? total}</div>
          <div className="text-xs text-muted-foreground">{t('audit.totalEvents')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-status-success">{grantedCount}</div>
          <div className="text-xs text-muted-foreground">{t('audit.grantedAccess')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-status-danger">{deniedCount}</div>
          <div className="text-xs text-muted-foreground">{t('audit.deniedAccess')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-foreground">{valueReadCount}</div>
          <div className="text-xs text-muted-foreground">{t('audit.valueReads')}</div>
        </Card>
      </div>

      {/* Logs List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t('audit.loading')}</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-destructive">
            {t('audit.loadFailed')}: {error.message}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title={t('audit.emptyTitle')}
            description={t('audit.emptyDesc')}
            icon={<Shield className="h-6 w-6" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.time')}</TableHead>
                  <TableHead>{t('audit.token')}</TableHead>
                  <TableHead>{t('audit.secret')}</TableHead>
                  <TableHead>{t('audit.action')}</TableHead>
                  <TableHead>{t('audit.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-foreground">
                      {log.actor_label || 'System'}
                    </TableCell>
                    <TableCell className="font-mono text-foreground">
                      {log.resource_label || 'N/A'}
                    </TableCell>
                    <TableCell className="text-foreground">{log.action}</TableCell>
                    <TableCell>
                      {log.result === 'success' ? (
                        <Badge
                          variant="default"
                          className="gap-1 bg-status-success-subtle text-status-success-subtle-foreground hover:bg-status-success-subtle"
                        >
                          <CheckCircle className="h-3 w-3" />
                          {t('audit.granted')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          {t('audit.denied')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      <PaginationControls
        offset={offset}
        limit={PAGE_SIZE}
        total={total}
        onOffsetChange={setOffset}
      />
    </main>
  );
}
