'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  FileKey2,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useSecrets } from '@/domains/secret';
import { useAgents } from '@/domains/agent';
import { useAuditStats } from '@/domains/audit';
import { useI18n } from '@/components/i18n-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function VaultGateDashboard() {
  const { t, locale } = useI18n();
  const { total: totalSecrets, isLoading: secretsLoading } = useSecrets({ limit: 1 });
  const { total: activeAgents, isLoading: agentsLoading } = useAgents({
    limit: 1,
    status: 'active',
  });
  const [activityWindowStart] = useState(() =>
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  );
  const { stats, isLoading: statsLoading } = useAuditStats({ created_from: activityWindowStart });
  const number = new Intl.NumberFormat(locale);
  const denied = stats?.denied ?? 0;

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('dashboard.controlPlane')}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('dashboard.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/secrets">
            <KeyRound />
            {t('dashboard.createSecret')}
          </Link>
        </Button>
      </header>

      <section
        aria-label={t('dashboard.securityStatus')}
        className={`grid gap-4 border-y px-1 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${denied > 0 ? 'border-status-warning/40' : 'border-status-success/30'}`}
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${denied > 0 ? 'bg-status-warning-subtle text-status-warning-subtle-foreground' : 'bg-status-success-subtle text-status-success-subtle-foreground'}`}
        >
          {denied > 0 ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
        <div>
          <h2 className="font-semibold text-foreground">
            {t(denied > 0 ? 'dashboard.deniedDetected' : 'dashboard.noDenied')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(denied > 0 ? 'dashboard.deniedDetectedDesc' : 'dashboard.noDeniedDesc', {
              count: denied,
            })}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/audit">
            {t('dashboard.reviewAudit')}
            <ArrowRight />
          </Link>
        </Button>
      </section>

      <section aria-label={t('dashboard.summary')} className="grid border-y sm:grid-cols-3">
        <Metric
          icon={<FileKey2 />}
          label={t('dashboard.totalSecrets')}
          value={totalSecrets}
          loading={secretsLoading}
          formatter={number}
        />
        <Metric
          icon={<Bot />}
          label={t('dashboard.activeAgents')}
          value={activeAgents}
          loading={agentsLoading}
          formatter={number}
        />
        <Metric
          icon={<ShieldCheck />}
          label={t('dashboard.recentActivity')}
          value={stats?.total ?? 0}
          loading={statsLoading}
          formatter={number}
        />
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t('dashboard.setupPath')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.setupPathDesc')}</p>
          </div>
          <div className="divide-y border-y">
            <WorkflowStep
              href="/secrets"
              complete={totalSecrets > 0}
              title={t('dashboard.workflowSecrets')}
              description={t('dashboard.workflowSecretsDesc')}
            />
            <WorkflowStep
              href="/agents"
              complete={activeAgents > 0}
              title={t('dashboard.workflowAgents')}
              description={t('dashboard.workflowAgentsDesc')}
            />
            <WorkflowStep
              href="/audit"
              complete={(stats?.total ?? 0) > 0}
              title={t('dashboard.workflowAudit')}
              description={t('dashboard.workflowAuditDesc')}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t('dashboard.activity24h')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.activity24hDesc')}</p>
          </div>
          <dl className="divide-y border-y text-sm">
            <ActivityRow
              label={t('dashboard.grantedRequests')}
              value={stats?.granted}
              loading={statsLoading}
              formatter={number}
              tone="success"
            />
            <ActivityRow
              label={t('dashboard.deniedRequests')}
              value={stats?.denied}
              loading={statsLoading}
              formatter={number}
              tone="danger"
            />
            <ActivityRow
              label={t('dashboard.valueReads')}
              value={stats?.value_reads}
              loading={statsLoading}
              formatter={number}
            />
          </dl>
          <Link
            href="/docs"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {t('dashboard.openDocs')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  loading,
  formatter,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  formatter: Intl.NumberFormat;
}) {
  return (
    <div className="flex items-center gap-4 border-b p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <div>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{formatter.format(value)}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function WorkflowStep({
  href,
  complete,
  title,
  description,
}: {
  href: string;
  complete: boolean;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-2 py-4 hover:bg-accent/50 sm:px-3"
    >
      {complete ? (
        <CheckCircle2 className="h-5 w-5 text-status-success" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function ActivityRow({
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
    <div className="flex min-h-14 items-center justify-between gap-4 px-2 sm:px-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-semibold tabular-nums ${color}`}>
        {loading ? '—' : formatter.format(value ?? 0)}
      </dd>
    </div>
  );
}
