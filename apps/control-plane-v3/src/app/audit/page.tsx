'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/domains/audit';
import { Card } from '@/shared/ui-primitives/card';
import { Badge } from '@/shared/ui-primitives/badge';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
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
          <h1 className="text-2xl font-bold text-[var(--kw-text)] sm:text-3xl">
            {t('audit.title')}
          </h1>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
            {t('audit.description')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--kw-text-muted)]" />
            <span className="text-sm font-medium text-[var(--kw-text)]">{t('audit.filters')}</span>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('audit.filters')}>
            <button
              type="button"
              aria-pressed={isAllActive}
              onClick={() => setFilter({})}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                isAllActive
                  ? 'bg-[var(--kw-primary-500)] text-white'
                  : 'bg-[var(--kw-surface-alt)] text-[var(--kw-text)] hover:bg-[var(--kw-surface)]'
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
                  ? 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)]'
                  : 'bg-[var(--kw-surface-alt)] text-[var(--kw-text)] hover:bg-[var(--kw-surface)]'
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
                  ? 'bg-[var(--kw-red-surface)] text-[var(--kw-red-text)]'
                  : 'bg-[var(--kw-surface-alt)] text-[var(--kw-text)] hover:bg-[var(--kw-surface)]'
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
          <div className="text-xl font-bold text-[var(--kw-text)]">{total}</div>
          <div className="text-xs text-[var(--kw-text-muted)]">{t('audit.totalEvents')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-[var(--kw-green-text)]">
            {logs.filter((l) => l.granted).length}
          </div>
          <div className="text-xs text-[var(--kw-text-muted)]">{t('audit.grantedAccess')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-[var(--kw-red-text)]">
            {logs.filter((l) => !l.granted).length}
          </div>
          <div className="text-xs text-[var(--kw-text-muted)]">{t('audit.deniedAccess')}</div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="text-xl font-bold text-[var(--kw-text)]">
            {logs.filter((l) => l.action === 'read_value').length}
          </div>
          <div className="text-xs text-[var(--kw-text-muted)]">{t('audit.valueReads')}</div>
        </Card>
      </div>

      {/* Logs List */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--kw-text-muted)]">
            {t('audit.loading')}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-[var(--kw-red-text)]">
            {t('audit.loadFailed')}: {error.message}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-surface-alt)]">
              <Shield className="h-6 w-6 text-[var(--kw-text-muted)]" />
            </div>
            <h3 className="mb-2 font-semibold text-[var(--kw-text)]">{t('audit.emptyTitle')}</h3>
            <p className="text-sm text-[var(--kw-text-muted)]">
              {t('audit.emptyDesc')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--kw-surface-alt)]">
                <tr>
                  <th className="px-4 py-3 font-medium text-[var(--kw-text-muted)]">{t('audit.time')}</th>
                  <th className="px-4 py-3 font-medium text-[var(--kw-text-muted)]">{t('audit.token')}</th>
                  <th className="px-4 py-3 font-medium text-[var(--kw-text-muted)]">{t('audit.secret')}</th>
                  <th className="px-4 py-3 font-medium text-[var(--kw-text-muted)]">{t('audit.action')}</th>
                  <th className="px-4 py-3 font-medium text-[var(--kw-text-muted)]">{t('audit.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--kw-border)]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--kw-surface-alt)]/50">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--kw-text-muted)]">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--kw-text)]">
                      {log.token_id ? `${log.token_id.slice(0, 8)}...` : 'System'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--kw-text)]">
                      {log.secret_id ? `${log.secret_id.slice(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-[var(--kw-text)]">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      {log.granted ? (
                        <Badge variant="success" leftIcon={<CheckCircle className="h-3 w-3" />}>
                          {t('audit.granted')}
                        </Badge>
                      ) : (
                        <Badge variant="error" leftIcon={<XCircle className="h-3 w-3" />}>
                          {t('audit.denied')}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Info Card */}
      <Card className="border border-[var(--kw-orange-surface)] bg-[var(--kw-orange-surface)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--kw-orange-surface)]">
            <Shield className="h-4 w-4 text-[var(--kw-orange-text)]" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-[var(--kw-orange-text)]">
              {t('audit.title')}
            </p>
            <p className="mt-1 text-[var(--kw-orange-text)]">
              {t('audit.description')}
            </p>
          </div>
        </div>
      </Card>
    </main>
  );
}
