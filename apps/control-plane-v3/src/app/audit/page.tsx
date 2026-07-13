'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/domains/audit';
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
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

export default function AuditPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<{
    action?: string;
    granted?: boolean;
  }>({});

  const { logs, total, isLoading, error } = useAuditLogs({
    limit: 100,
    ...filter,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const isAllActive = !filter.action && !filter.granted;
  const isGrantedActive = filter.granted === true;
  const isDeniedActive = filter.granted === false;

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
              onClick={() => setFilter({})}
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
              onClick={() => setFilter({ granted: true })}
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
              onClick={() => setFilter({ granted: false })}
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
          <div className="text-xl font-bold text-foreground">{total}</div>
          <div className="text-xs text-muted-foreground">{t('audit.totalEvents')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-status-success">
            {logs.filter((l) => l.granted).length}
          </div>
          <div className="text-xs text-muted-foreground">{t('audit.grantedAccess')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-status-danger">
            {logs.filter((l) => !l.granted).length}
          </div>
          <div className="text-xs text-muted-foreground">{t('audit.deniedAccess')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-foreground">
            {logs.filter((l) => l.action === 'read_value').length}
          </div>
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
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">{t('audit.emptyTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('audit.emptyDesc')}</p>
          </div>
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
                        {formatDate(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-foreground">
                      {log.token_id ? `${log.token_id.slice(0, 8)}...` : 'System'}
                    </TableCell>
                    <TableCell className="font-mono text-foreground">
                      {log.secret_id ? `${log.secret_id.slice(0, 8)}...` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {log.action.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      {log.granted ? (
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

      {/* Info Card */}
      <Card className="border border-status-warning/20 bg-status-warning-subtle p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-status-warning/10">
            <Shield className="h-4 w-4 text-status-warning" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-status-warning-subtle-foreground">{t('audit.title')}</p>
            <p className="mt-1 text-status-warning-subtle-foreground/80">
              {t('audit.description')}
            </p>
          </div>
        </div>
      </Card>
    </main>
  );
}
