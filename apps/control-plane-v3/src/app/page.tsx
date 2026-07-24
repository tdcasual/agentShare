'use client';

import Link from 'next/link';
import { useState } from 'react';
import { mutate } from 'swr';
import { ArrowRight, KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useSecrets } from '@/domains/secret';
import { useAgents } from '@/domains/agent';
import { useAuditStats } from '@/domains/audit';
import { buildApiPath } from '@/lib/vaultgate-api';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function VaultGateDashboard() {
  const { t, locale } = useI18n();
  const {
    total: totalSecrets,
    isLoading: secretsLoading,
    error: secretsError,
    refresh: refreshSecrets,
  } = useSecrets({ limit: 1 });
  const {
    total: activeAgents,
    isLoading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
  } = useAgents({
    limit: 1,
    status: 'active',
  });
  const [activityWindowStart] = useState(() =>
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  );
  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
  } = useAuditStats({
    created_from: activityWindowStart,
  });
  const number = new Intl.NumberFormat(locale);
  const denied = stats?.denied ?? 0;
  // 任一数据源失败时安全状态不可信：显示中性"无法确认"，而不是绿色"无拒绝"
  const statusFailed = Boolean(secretsError || agentsError || statsError);

  function retryStatus() {
    void Promise.all([
      refreshSecrets(),
      refreshAgents(),
      // useAuditStats 未暴露 mutate，用全局 mutate 按相同 key 重校验
      mutate(buildApiPath('/api/admin/audit-stats', { created_from: activityWindowStart })),
    ]);
  }

  const statusTitle = statusFailed
    ? t('dashboard.statusUnknown')
    : t(denied > 0 ? 'dashboard.deniedDetected' : 'dashboard.noDenied');
  // 一切正常时标题已说明全部，不再附加解释；只有需要用户关注（拒绝/失败）才给上下文
  const statusDescription = statusFailed
    ? t('dashboard.statusUnknownDesc')
    : denied > 0
      ? t('dashboard.deniedDetectedDesc', { count: denied })
      : null;

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t('dashboard.controlPlane')}
        </h1>
        <Button asChild size="sm">
          <Link href="/secrets">
            <KeyRound />
            {t('dashboard.createSecret')}
          </Link>
        </Button>
      </header>

      <section
        aria-label={t('dashboard.securityStatus')}
        className={`flex flex-wrap items-center gap-3 border-y px-3 py-2.5 ${
          statusFailed ? '' : denied > 0 ? 'border-status-warning/40' : 'border-status-success/30'
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
            statusFailed
              ? 'bg-muted text-muted-foreground'
              : denied > 0
                ? 'bg-status-warning-subtle text-status-warning-subtle-foreground'
                : 'bg-status-success-subtle text-status-success-subtle-foreground'
          }`}
        >
          {statusFailed || denied > 0 ? (
            <ShieldAlert className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{statusTitle}</p>
          {statusDescription && (
            <p className="mt-0.5 text-xs text-muted-foreground">{statusDescription}</p>
          )}
        </div>
        {statusFailed ? (
          <Button variant="outline" size="sm" onClick={retryStatus}>
            {t('common.retry')}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href="/audit">
              {t('dashboard.reviewAudit')}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </section>

      <section
        aria-label={t('dashboard.summary')}
        className="grid grid-cols-2 gap-px border-y bg-border sm:grid-cols-3 xl:grid-cols-6"
      >
        <Metric
          label={t('dashboard.totalSecrets')}
          value={totalSecrets}
          loading={secretsLoading}
          failed={Boolean(secretsError)}
          formatter={number}
        />
        <Metric
          label={t('dashboard.activeAgents')}
          value={activeAgents}
          loading={agentsLoading}
          failed={Boolean(agentsError)}
          formatter={number}
        />
        <Metric
          label={t('dashboard.recentActivity')}
          value={stats?.total ?? 0}
          loading={statsLoading}
          failed={Boolean(statsError)}
          formatter={number}
        />
        <Metric
          label={t('dashboard.grantedRequests')}
          value={stats?.granted ?? 0}
          loading={statsLoading}
          failed={Boolean(statsError)}
          formatter={number}
          tone="success"
        />
        <Metric
          label={t('dashboard.deniedRequests')}
          value={denied}
          loading={statsLoading}
          failed={Boolean(statsError)}
          formatter={number}
          tone="danger"
        />
        <Metric
          label={t('dashboard.valueReads')}
          value={stats?.value_reads ?? 0}
          loading={statsLoading}
          failed={Boolean(statsError)}
          formatter={number}
        />
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  loading,
  failed,
  formatter,
  tone,
}: {
  label: string;
  value: number;
  loading: boolean;
  failed?: boolean;
  formatter: Intl.NumberFormat;
  tone?: 'success' | 'danger';
}) {
  const color =
    tone === 'success'
      ? 'text-status-success-subtle-foreground'
      : tone === 'danger'
        ? 'text-status-danger'
        : 'text-foreground';
  return (
    <div className="bg-background p-4">
      {loading ? (
        <Skeleton className="h-7 w-14" />
      ) : failed ? (
        <p className="text-2xl font-semibold tabular-nums text-muted-foreground">—</p>
      ) : (
        <p className={`text-2xl font-semibold tabular-nums ${color}`}>{formatter.format(value)}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
