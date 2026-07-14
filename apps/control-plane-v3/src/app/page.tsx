'use client';

import Link from 'next/link';
import { useSecrets } from '@/domains/secret';
import { useAgents } from '@/domains/agent';
import { useAuditStats } from '@/domains/audit';
import { Card } from '@/components/ui/card';
import { Callout } from '@/components/ui/callout';
import { ArrowRight, Plus, Shield } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';

export default function VaultGateDashboard() {
  const { t } = useI18n();
  const { secrets, isLoading: secretsLoading } = useSecrets();
  const { agents, isLoading: agentsLoading } = useAgents();
  const { stats, isLoading: statsLoading } = useAuditStats();

  const totalSecrets = secrets.length;
  const activeAgents = agents.filter((agent) => agent.status === 'active').length;
  const recentActivity = stats?.total ?? 0;

  return (
    <main id="main-content" className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {t('dashboard.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </div>

      {/* Info Banner */}
      <Callout icon={<Shield className="h-4 w-4 text-status-brand" aria-hidden="true" />}>
        <p className="font-medium text-status-brand-subtle-foreground">{t('dashboard.ready')}</p>
        <p className="mt-1 text-status-brand-subtle-foreground">{t('dashboard.readyDesc')}</p>
      </Callout>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label={t('dashboard.totalSecrets')}
          value={totalSecrets}
          isLoading={secretsLoading}
        />
        <StatCard
          label={t('dashboard.activeAgents')}
          value={activeAgents}
          isLoading={agentsLoading}
        />
        <StatCard
          label={t('dashboard.recentActivity')}
          value={recentActivity}
          isLoading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t('dashboard.quickActions')}</h2>
        <div className="divide-y rounded-xl border bg-card">
          <QuickActionRow
            href="/secrets"
            label={t('dashboard.createSecret')}
            description={t('dashboard.createSecretDesc')}
          />
          <QuickActionRow
            href="/agents"
            label={t('dashboard.createToken')}
            description={t('dashboard.createTokenDesc')}
          />
          <QuickActionRow
            href="/audit"
            label={t('dashboard.viewAudit')}
            description={t('dashboard.viewAuditDesc')}
          />
        </div>
      </section>

      {/* Browse */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">{t('dashboard.browse')}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <QuickLink href="/secrets" label={t('dashboard.secrets')} count={totalSecrets} />
          <QuickLink href="/agents" label={t('dashboard.agents')} count={activeAgents} />
          <QuickLink href="/audit" label={t('dashboard.auditLogs')} />
        </div>
      </Card>

      {/* API Quick Reference */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {t('dashboard.apiReference')}
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="mb-1 text-foreground">{t('dashboard.publicEndpoints')}</p>
            <ul className="ml-2 list-inside list-disc space-y-1">
              <li>
                <code className="font-mono text-xs">GET /healthz</code> —{' '}
                {t('dashboard.healthCheck')}
              </li>
              <li>
                <code className="font-mono text-xs">GET /docs</code> —{' '}
                {t('dashboard.apiDocumentation')}
              </li>
              <li>
                <code className="font-mono text-xs">GET /openapi.json</code> —{' '}
                {t('dashboard.openapiSchema')}
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-1 text-foreground">{t('dashboard.agentAccess')}</p>
            <ul className="ml-2 list-inside list-disc space-y-1">
              <li>
                <code className="font-mono text-xs">GET /api/vault/secrets</code> —{' '}
                {t('dashboard.listSecrets')}
              </li>
              <li>
                <code className="font-mono text-xs">GET /api/vault/secrets/:id/value</code> —{' '}
                {t('dashboard.getSecretValue')}
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </main>
  );
}

const StatCard = function StatCard({
  label,
  value,
  isLoading = false,
}: {
  label: string;
  value: number;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-2xl font-semibold text-foreground">{isLoading ? '…' : value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
};

const QuickActionRow = function QuickActionRow({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-accent"
    >
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Plus className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
    </Link>
  );
};

const QuickLink = function QuickLink({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {count}
          </span>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </Link>
  );
};
