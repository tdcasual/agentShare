'use client';

import Link from 'next/link';
import { useSecrets } from '@/domains/secret';
import { useTokens } from '@/domains/token';
import { useAuditStats } from '@/domains/audit';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Key, Shield, Activity, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

const KeyIcon = <Key className="h-6 w-6 text-status-brand" />;
const ShieldIcon = <Shield className="h-6 w-6 text-status-success" />;
const ActivityIcon = <Activity className="h-6 w-6 text-status-warning" />;

export default function VaultGateDashboard() {
  const { t } = useI18n();
  const { secrets, isLoading: secretsLoading } = useSecrets();
  const { tokens, isLoading: tokensLoading } = useTokens();
  const { stats, isLoading: statsLoading } = useAuditStats();

  const totalSecrets = secrets.length;
  const activeTokens = tokens.filter((token) => token.status === 'active').length;
  const recentActivity = stats?.recent ?? 0;

  return (
    <main id="main-content" className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {t('dashboard.title')}
            </h1>
            <Badge variant="secondary">v1.0</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <Link href="/tokens">
          <Button
            variant="default"
            size="sm"
            className="shrink-0 whitespace-nowrap md:h-11 md:px-8 md:text-base"
            leftIcon={<Sparkles className="h-4 w-4 md:h-5 md:w-5" />}
          >
            <span className="hidden md:inline">{t('dashboard.manageTokens')}</span>
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <Card className="border border-status-brand/20 bg-status-brand-subtle p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-status-brand/10">
            <Shield className="h-4 w-4 text-status-brand" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-status-brand-subtle-foreground">
              {t('dashboard.ready')}
            </p>
            <p className="mt-1 text-status-brand-subtle-foreground/80">
              {t('dashboard.readyDesc')}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          icon={KeyIcon}
          label={t('dashboard.totalSecrets')}
          value={totalSecrets}
          color="purple"
          isLoading={secretsLoading}
        />
        <StatCard
          icon={ShieldIcon}
          label={t('dashboard.activeTokens')}
          value={activeTokens}
          color="green"
          isLoading={tokensLoading}
        />
        <StatCard
          icon={ActivityIcon}
          label={t('dashboard.recentActivity')}
          value={recentActivity}
          color="orange"
          isLoading={statsLoading}
        />
      </div>

      {/* Quick Actions */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t('dashboard.quickActions')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionButton
            href="/secrets"
            icon={<Key className="h-4 w-4" />}
            label={t('dashboard.createSecret')}
            description={t('dashboard.createSecretDesc')}
          />
          <ActionButton
            href="/tokens"
            icon={<Shield className="h-4 w-4" />}
            label={t('dashboard.createToken')}
            description={t('dashboard.createTokenDesc')}
          />
          <ActionButton
            href="/audit"
            icon={<Activity className="h-4 w-4" />}
            label={t('dashboard.viewAudit')}
            description={t('dashboard.viewAuditDesc')}
          />
        </div>
      </Card>

      {/* Quick Links */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('dashboard.browse')}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <QuickLink href="/secrets" label={t('dashboard.secrets')} count={totalSecrets} />
          <QuickLink href="/tokens" label={t('dashboard.tokens')} count={activeTokens} />
          <QuickLink href="/audit" label={t('dashboard.auditLogs')} />
        </div>
      </Card>

      {/* API Quick Reference */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t('dashboard.apiReference')}</h3>
          <Badge variant="secondary">v1.0</Badge>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t('dashboard.publicEndpoints')}</p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>
              <code className="font-mono text-xs">GET /healthz</code> - {t('dashboard.healthCheck')}
            </li>
            <li>
              <code className="font-mono text-xs">GET /docs</code> -{' '}
              {t('dashboard.apiDocumentation')}
            </li>
            <li>
              <code className="font-mono text-xs">GET /openapi.json</code> -{' '}
              {t('dashboard.openapiSchema')}
            </li>
          </ul>
          <p className="mt-3">{t('dashboard.agentAccess')}</p>
          <ul className="ml-2 list-inside list-disc space-y-1">
            <li>
              <code className="font-mono text-xs">GET /api/vault</code> -{' '}
              {t('dashboard.listSecrets')}
            </li>
            <li>
              <code className="font-mono text-xs">GET /api/vault/:id?fields=value</code> -{' '}
              {t('dashboard.getSecret')}
            </li>
            <li>
              <code className="font-mono text-xs">GET /api/vault/:id/value</code> -{' '}
              {t('dashboard.getSecretValue')}
            </li>
          </ul>
        </div>
      </Card>
    </main>
  );
}

const StatCard = function StatCard({
  icon,
  label,
  value,
  color,
  isLoading = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'purple' | 'green' | 'orange';
  isLoading?: boolean;
}) {
  const colorClasses = {
    purple: 'bg-status-brand-subtle text-status-brand-subtle-foreground',
    green: 'bg-status-success-subtle text-status-success-subtle-foreground',
    orange: 'bg-status-warning-subtle text-status-warning-subtle-foreground',
  };

  return (
    <Card className="flex items-center gap-3 p-3 transition-shadow hover:shadow-md sm:gap-4 sm:p-4">
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl [&>svg]:h-4 [&>svg]:w-4 [&>svg]:sm:h-6 [&>svg]:sm:w-6',
          colorClasses[color]
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground sm:text-2xl">{isLoading ? '...' : value}</p>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
      </div>
    </Card>
  );
};

const ActionButton = function ActionButton({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
};

const QuickLink = function QuickLink({
  href,
  label,
  count,
  external = false,
}: {
  href: string;
  label: string;
  count?: number;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
};
