'use client';

import { memo, useCallback } from 'react';
import { Cpu, KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Layout } from '@/interfaces/human/layout';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  ManagementSessionRecoveryNotice,
  isUnauthorizedError,
} from '@/lib/management-session-recovery';
import { useCreateSecret, useCreateCapability } from '@/domains/governance';
import {
  deriveGovernanceStatus,
  governanceStatusTranslationKey,
  type GovernedCapability,
  type GovernedSecret,
} from '@/domains/governance';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { MetricCard } from '@/shared/ui-primitives/metric';
import { Input } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';
import { FilterButton } from '@/shared/ui-primitives/filter-button';
import { cn } from '@/lib/utils';
import { translateAccountRole, translateTokenStatus } from '@/lib/enum-labels';
import { useAssetsPage } from './use-assets-page';
import { useAssetsForm } from './use-assets-form';

const selectClassName =
  'w-full rounded-2xl border-2 border-[var(--kw-border)] bg-white px-4 py-3 text-base text-[var(--kw-text)] outline-none transition-colors transition-shadow duration-200 focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]';

export default function AssetsPage() {
  return (
    <Layout>
      <AssetsContent />
    </Layout>
  );
}

const AssetsContent = memo(function AssetsContent() {
  const page = useAssetsPage();
  const createSecret = useCreateSecret();
  const createCapability = useCreateCapability();

  const form = useAssetsForm({
    createSecret,
    createCapability,
    secrets: page.secrets,
    consumeUnauthorized: page.consumeUnauthorized,
    clearAllAuthErrors: page.clearAllAuthErrors,
    onSecretCreated: page.handleRefresh,
    onCapabilityCreated: page.handleRefresh,
  });

  return (
    <div className="space-y-6">
      <Header page={page} form={form} />
      <Metrics page={page} />
      <FilterCard page={page} />
      <OperatorCard page={page} />
      <Alerts page={page} form={form} />
      <AssetGrids page={page} form={form} />
      <SecretModal form={form} />
      <CapabilityModal page={page} form={form} />
    </div>
  );
});

function Header({
  page,
  form,
}: {
  page: ReturnType<typeof useAssetsPage>;
  form: ReturnType<typeof useAssetsForm>;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <div className="dark:bg-[var(--kw-dark-surface)]/80 inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 px-4 py-2 text-sm text-[var(--kw-primary-600)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
          <ShieldCheck className="h-4 w-4" />
          {page.t('assets.subtitle')}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {page.t('assets.title')}
          </h1>
          <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {page.t('assets.description')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={page.handleRefresh} loading={page.isRefreshing}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {page.t('common.refresh')}
        </Button>
        <Button variant="secondary" onClick={form.openSecretModal}>
          <LockKeyhole className="mr-2 h-4 w-4" />
          {page.t('assets.newSecret')}
        </Button>
        <Button onClick={form.openCapabilityModal}>
          <Plus className="mr-2 h-4 w-4" />
          {page.t('assets.newCapability')}
        </Button>
      </div>
    </div>
  );
}

function Metrics({ page }: { page: ReturnType<typeof useAssetsPage> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        variant="asset"
        label={page.t('assets.metrics.secrets')}
        value={page.secrets.length.toString()}
        hint={page.t('assets.metrics.secretsHint')}
      />
      <MetricCard
        variant="asset"
        label={page.t('assets.metrics.capabilities')}
        value={page.capabilities.length.toString()}
        hint={page.t('assets.metrics.capabilitiesHint')}
      />
      <MetricCard
        variant="asset"
        label={page.t('assets.metrics.restricted')}
        value={page.metrics.restrictedCapabilities.toString()}
        hint={page.t('assets.metrics.restrictedHint')}
      />
      <MetricCard
        variant="asset"
        label={page.t('assets.metrics.activeTokens')}
        value={page.metrics.activeTokens.toString()}
        hint={`${page.allTokens.length} ${page.t('common.total')}`}
      />
    </div>
  );
}

function FilterCard({ page }: { page: ReturnType<typeof useAssetsPage> }) {
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
      <div className="flex flex-col gap-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {page.t('assets.governance.title')}
          </h2>
          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {page.t('assets.governance.description')}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <Badge variant="warning">
            {page.t('assets.governance.pendingReviewItems', {
              count: page.metrics.pendingReviewItems,
            })}
          </Badge>
          <Badge variant="success">
            {page.t('assets.governance.activeAssets', { count: page.metrics.activeAssets })}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {page.t('assets.governance.publicationState')}
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterButton
                value="all"
                active={page.selectedPublicationFilter === 'all'}
                onSelect={page.setSelectedPublicationFilter}
                label={page.t('assets.governance.allStates')}
              />
              <FilterButton
                value="pending_review"
                active={page.selectedPublicationFilter === 'pending_review'}
                onSelect={page.setSelectedPublicationFilter}
                label={page.t('assets.governance.pendingReview')}
              />
              <FilterButton
                value="active"
                active={page.selectedPublicationFilter === 'active'}
                onSelect={page.setSelectedPublicationFilter}
                label={page.t('common.active')}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {page.t('assets.governance.resourceLane')}
            </p>
            <div className="flex flex-wrap gap-2">
              <FilterButton
                value="all"
                active={page.selectedResourceFilter === 'all'}
                onSelect={page.setSelectedResourceFilter}
                label={page.t('assets.governance.allResources')}
              />
              <FilterButton
                value="secrets"
                active={page.selectedResourceFilter === 'secrets'}
                onSelect={page.setSelectedResourceFilter}
                label={page.t('assets.metrics.secrets')}
              />
              <FilterButton
                value="capabilities"
                active={page.selectedResourceFilter === 'capabilities'}
                onSelect={page.setSelectedResourceFilter}
                label={page.t('assets.metrics.capabilities')}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OperatorCard({ page }: { page: ReturnType<typeof useAssetsPage> }) {
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        <Badge variant="primary">{page.t('common.operator')}</Badge>
        <span className="dark:text-[var(--kw-dark-text)]">
          {page.session?.email ?? page.t('common.loading')}
        </span>
        <span className="text-[var(--kw-border)] dark:text-[var(--kw-dark-border)]">•</span>
        <span>{page.session?.role ? translateAccountRole(page.t, page.session.role) : '...'}</span>
        <span className="text-[var(--kw-border)] dark:text-[var(--kw-dark-border)]">•</span>
        <span>{page.t('assets.policyNote')}</span>
      </div>
    </Card>
  );
}

function Alerts({
  page,
  form,
}: {
  page: ReturnType<typeof useAssetsPage>;
  form: ReturnType<typeof useAssetsForm>;
}) {
  return (
    <>
      {page.shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={page.t('assets.sessionExpired')} />
      ) : null}

      {!page.shouldShowSessionExpired && page.shouldShowForbidden ? (
        <ManagementForbiddenAlert message={page.t('assets.sessionForbidden')} />
      ) : null}

      {page.refreshError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
        >
          {page.refreshError}
        </Card>
      ) : null}

      {!page.shouldShowForbidden && (page.combinedError || form.error) ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
        >
          {page.combinedError || form.error}
        </Card>
      ) : null}

      {page.loading ? (
        <Card className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <span className="animate-spin">🌸</span>
          {page.t('assets.loading')}
        </Card>
      ) : null}

      {page.focusedAsset ? (
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              {page.t('assets.focusedAsset')}
            </p>
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {'display_name' in page.focusedAsset
                ? page.focusedAsset.display_name
                : page.focusedAsset.name}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {page.focus.resourceKind} · {page.focusedAsset.id}
            </p>
          </div>
        </Card>
      ) : null}
    </>
  );
}

function AssetGrids({
  page,
  form,
}: {
  page: ReturnType<typeof useAssetsPage>;
  form: ReturnType<typeof useAssetsForm>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <SecretsPanel page={page} form={form} />
      <CapabilitiesPanel page={page} form={form} />
    </div>
  );
}

function SecretsPanel({
  page,
  form,
}: {
  page: ReturnType<typeof useAssetsPage>;
  form: ReturnType<typeof useAssetsForm>;
}) {
  return (
    <Card
      variant="feature"
      className="space-y-4 dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-rose-surface)] px-3 py-1 text-sm text-[var(--kw-rose-text)]">
            <KeyRound className="h-4 w-4" />
            {page.t('assets.secrets.inventory')}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {page.t('assets.secrets.title')}
          </h2>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {page.t('assets.secrets.description')}
          </p>
        </div>
        <Button variant="secondary" onClick={form.openSecretModal}>
          <Plus className="mr-2 h-4 w-4" />
          {page.t('common.new')}
        </Button>
      </div>

      <div className="space-y-3">
        {!page.shouldShowSessionExpired && page.visibleSecrets.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-8 w-8" />}
            title={
              page.selectedResourceFilter === 'capabilities'
                ? page.t('assets.secretsHiddenTitle')
                : page.t('assets.secrets.emptyTitle')
            }
            description={
              page.selectedResourceFilter === 'capabilities'
                ? page.t('assets.secretsHiddenDesc')
                : page.selectedPublicationFilter === 'all'
                  ? page.t('assets.secrets.emptyDesc')
                  : page.t('assets.noSecretsFilter')
            }
          />
        ) : page.shouldShowSessionExpired && isUnauthorizedError(page.secretsQuery.error) ? (
          <ManagementSessionRecoveryNotice message={page.t('assets.secrets.reloadInventory')} />
        ) : (
          page.visibleSecrets.map((secret) => (
            <SecretCard key={secret.id} secret={secret} focus={page.focus} t={page.t} />
          ))
        )}
      </div>
    </Card>
  );
}

function SecretCard({
  secret,
  focus,
  t,
}: {
  secret: GovernedSecret;
  focus: { resourceKind?: string; resourceId?: string };
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const governanceStatus = deriveGovernanceStatus(secret);
  return (
    <Card
      data-testid={`secret-card-${secret.id}`}
      data-focus-state={
        focus.resourceKind === 'secret' && focus.resourceId === secret.id ? 'focused' : 'default'
      }
      className={cn(
        'dark:bg-[var(--kw-dark-bg)]/80 border bg-white/80 p-5',
        focus.resourceKind === 'secret' && focus.resourceId === secret.id
          ? 'ring-[var(--kw-primary-400)]/20 border-[var(--kw-primary-400)] ring-1 dark:border-[var(--kw-primary-400)]'
          : 'border-[var(--kw-border)]/80 dark:border-[var(--kw-dark-border)]'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {secret.display_name}
          </h3>
          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {secret.provider} · {secret.kind}
            {secret.environment ? ` · ${secret.environment}` : ''}
          </p>
          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {t('assets.governanceStateLine', {
              state: t(governanceStatusTranslationKey(governanceStatus)),
            })}
          </p>
        </div>
        <Badge variant={statusVariant(governanceStatus)}>
          {t(governanceStatusTranslationKey(governanceStatus))}
        </Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoBlock
          label={t('assets.secrets.providerScopes')}
          value={secret.provider_scopes.join(', ') || t('common.notSpecified')}
        />
        <InfoBlock
          label={t('assets.secrets.resourceSelector')}
          value={secret.resource_selector || t('common.notSpecified')}
        />
      </div>
    </Card>
  );
}

function CapabilitiesPanel({
  page,
  form,
}: {
  page: ReturnType<typeof useAssetsPage>;
  form: ReturnType<typeof useAssetsForm>;
}) {
  return (
    <Card
      variant="feature"
      className="space-y-4 dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-purple-surface)] px-3 py-1 text-sm text-[var(--kw-purple-text)]">
            <Cpu className="h-4 w-4" />
            {page.t('assets.capabilities.access')}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {page.t('assets.capabilities.title')}
          </h2>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {page.t('assets.capabilities.description')}
          </p>
        </div>
        <Button onClick={form.openCapabilityModal}>
          <Plus className="mr-2 h-4 w-4" />
          {page.t('common.new')}
        </Button>
      </div>

      <div className="space-y-3">
        {!page.shouldShowSessionExpired && page.visibleCapabilities.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-8 w-8" />}
            title={
              page.selectedResourceFilter === 'secrets'
                ? page.t('assets.capabilitiesHiddenTitle')
                : page.t('assets.capabilities.emptyTitle')
            }
            description={
              page.selectedResourceFilter === 'secrets'
                ? page.t('assets.capabilitiesHiddenDesc')
                : page.selectedPublicationFilter === 'all'
                  ? page.t('assets.capabilities.emptyDesc')
                  : page.t('assets.noCapabilitiesFilter')
            }
          />
        ) : page.shouldShowSessionExpired && isUnauthorizedError(page.capabilitiesQuery.error) ? (
          <ManagementSessionRecoveryNotice message={page.t('assets.capabilities.reloadPolicy')} />
        ) : (
          page.visibleCapabilities.map((capability) => (
            <CapabilityCard
              key={capability.id}
              capability={capability}
              focus={page.focus}
              tokenNameById={page.tokenNameById}
              t={page.t}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function CapabilityCard({
  capability,
  focus,
  tokenNameById,
  t,
}: {
  capability: GovernedCapability;
  focus: { resourceKind?: string; resourceId?: string };
  tokenNameById: Record<string, string>;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const governanceStatus = deriveGovernanceStatus(capability);
  return (
    <Card
      data-testid={`capability-card-${capability.id}`}
      data-focus-state={
        focus.resourceKind === 'capability' && focus.resourceId === capability.id
          ? 'focused'
          : 'default'
      }
      className={cn(
        'dark:bg-[var(--kw-dark-bg)]/80 border bg-white/80 p-5',
        focus.resourceKind === 'capability' && focus.resourceId === capability.id
          ? 'ring-[var(--kw-primary-400)]/20 border-[var(--kw-primary-400)] ring-1 dark:border-[var(--kw-primary-400)]'
          : 'border-[var(--kw-border)]/80 dark:border-[var(--kw-dark-border)]'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {capability.name}
          </h3>
          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {t('assets.capabilities.summaryLine', {
              secretId: capability.secret_id,
              allowedMode: capability.allowed_mode,
              riskLevel: capability.risk_level,
            })}
          </p>
          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {t('assets.governanceStateLine', {
              state: t(governanceStatusTranslationKey(governanceStatus)),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariant(governanceStatus)}>
            {t(governanceStatusTranslationKey(governanceStatus))}
          </Badge>
          <Badge
            variant={
              capability.access_policy.mode === 'all_access_tokens' ? 'success' : 'warning'
            }
          >
            {capability.access_policy.mode === 'all_access_tokens'
              ? t('assets.capabilities.allTokens')
              : t('assets.capabilities.scopedAccess')}
          </Badge>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoBlock
          label={t('assets.capabilities.requiredProvider')}
          value={capability.required_provider || t('common.notSpecified')}
        />
        <InfoBlock
          label={t('assets.capabilities.requiredScopes')}
          value={capability.required_provider_scopes.join(', ') || t('common.notSpecified')}
        />
        <InfoBlock
          label={t('assets.capabilities.leaseTTL')}
          value={`${capability.lease_ttl_seconds}s`}
        />
        <InfoBlock
          label={t('assets.capabilities.tokenAccess')}
          value={formatAccessPolicy(capability, tokenNameById, t)}
        />
      </div>
    </Card>
  );
}

function SecretModal({ form }: { form: ReturnType<typeof useAssetsForm> }) {
  return (
    <Modal
      isOpen={form.showSecretModal}
      onClose={form.closeSecretModal}
      title={form.t('assets.secrets.modalTitle')}
      description={form.t('assets.secrets.modalDesc')}
      size="lg"
    >
      <form className="space-y-4" onSubmit={form.handleCreateSecret}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={form.t('assets.secrets.displayName')}
            value={form.secretForm.display_name}
            onChange={(event) =>
              form.setSecretForm((current) => ({ ...current, display_name: event.target.value }))
            }
            placeholder={form.t('assets.secrets.providerPlaceholder')}
          />
          <Input
            label={form.t('assets.secrets.kind')}
            value={form.secretForm.kind}
            onChange={(event) =>
              form.setSecretForm((current) => ({ ...current, kind: event.target.value }))
            }
            placeholder={form.t('assets.secrets.kindPlaceholder')}
          />
          <Input
            label={form.t('assets.secrets.provider')}
            value={form.secretForm.provider}
            onChange={(event) =>
              form.setSecretForm((current) => ({ ...current, provider: event.target.value }))
            }
            placeholder={form.t('assets.secrets.providerPlaceholderShort')}
          />
          <Input
            label={form.t('assets.secrets.environment')}
            value={form.secretForm.environment}
            onChange={(event) =>
              form.setSecretForm((current) => ({ ...current, environment: event.target.value }))
            }
            placeholder={form.t('assets.secrets.environmentPlaceholder')}
          />
        </div>
        <Input
          label={form.t('assets.secrets.value')}
          type="password"
          value={form.secretForm.value}
          onChange={(event) =>
            form.setSecretForm((current) => ({ ...current, value: event.target.value }))
          }
          placeholder={form.t('assets.secrets.valuePlaceholder')}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={form.t('assets.secrets.providerScopes')}
            value={form.secretForm.provider_scopes}
            onChange={(event) =>
              form.setSecretForm((current) => ({ ...current, provider_scopes: event.target.value }))
            }
            placeholder={form.t('assets.secrets.scopesPlaceholder')}
          />
          <Input
            label={form.t('assets.secrets.resourceSelector')}
            value={form.secretForm.resource_selector}
            onChange={(event) =>
              form.setSecretForm((current) => ({
                ...current,
                resource_selector: event.target.value,
              }))
            }
            placeholder={form.t('assets.secrets.resourceSelectorPlaceholder')}
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={form.closeSecretModal}>
            {form.t('common.cancel')}
          </Button>
          <Button type="submit" loading={form.submittingSecret}>
            {form.t('assets.secrets.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CapabilityModal({
  page,
  form,
}: {
  page: ReturnType<typeof useAssetsPage>;
  form: ReturnType<typeof useAssetsForm>;
}) {
  return (
    <Modal
      isOpen={form.showCapabilityModal}
      onClose={form.closeCapabilityModal}
      title={form.t('assets.capabilities.modalTitle')}
      description={form.t('assets.capabilities.modalDesc')}
      size="xl"
    >
      <form className="space-y-5" onSubmit={form.handleCreateCapability}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label={form.t('assets.capabilities.name')}
            value={form.capabilityForm.name}
            onChange={(event) =>
              form.setCapabilityForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={form.t('assets.secrets.displayNamePlaceholder')}
          />
          <div className="space-y-1.5">
            <label
              htmlFor="capability-secret"
              className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
            >
              {form.t('assets.capabilities.bindSecret')}
            </label>
            <select
              id="capability-secret"
              className={selectClassName}
              value={form.capabilityForm.secret_id}
              onChange={(event) => form.handleCapabilitySecretChange(event.target.value)}
            >
              <option value="">{form.t('assets.capabilities.selectSecret')}</option>
              {page.secrets.map((secret) => (
                <option key={secret.id} value={secret.id}>
                  {secret.display_name} · {secret.provider}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="capability-risk"
              className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
            >
              {form.t('assets.capabilities.riskLevel')}
            </label>
            <select
              id="capability-risk"
              className={selectClassName}
              value={form.capabilityForm.risk_level}
              onChange={(event) =>
                form.setCapabilityForm((current) => ({
                  ...current,
                  risk_level: event.target.value,
                }))
              }
            >
              <option value="low">{form.t('assets.capabilities.riskLevelLow')}</option>
              <option value="medium">{form.t('assets.capabilities.riskLevelMedium')}</option>
              <option value="high">{form.t('assets.capabilities.riskLevelHigh')}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="capability-mode"
              className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
            >
              {form.t('assets.capabilities.allowedMode')}
            </label>
            <select
              id="capability-mode"
              className={selectClassName}
              value={form.capabilityForm.allowed_mode}
              onChange={(event) =>
                form.setCapabilityForm((current) => ({
                  ...current,
                  allowed_mode: event.target.value,
                }))
              }
            >
              <option value="proxy_only">{form.t('assets.capabilities.modeProxyOnly')}</option>
              <option value="proxy_or_lease">
                {form.t('assets.capabilities.modeProxyOrLease')}
              </option>
            </select>
          </div>
          <Input
            label={form.t('assets.capabilities.leaseTTL')}
            type="number"
            value={form.capabilityForm.lease_ttl_seconds}
            onChange={(event) =>
              form.setCapabilityForm((current) => ({
                ...current,
                lease_ttl_seconds: event.target.value,
              }))
            }
          />
          <Input
            label={form.t('assets.capabilities.requiredProvider')}
            value={form.capabilityForm.required_provider}
            onChange={(event) =>
              form.setCapabilityForm((current) => ({
                ...current,
                required_provider: event.target.value,
              }))
            }
            placeholder={form.t('assets.secrets.providerPlaceholderShort')}
          />
          <Input
            label={form.t('assets.capabilities.requiredScopes')}
            value={form.capabilityForm.required_provider_scopes}
            onChange={(event) =>
              form.setCapabilityForm((current) => ({
                ...current,
                required_provider_scopes: event.target.value,
              }))
            }
            placeholder={form.t('assets.secrets.scopesPlaceholder')}
          />
        </div>

        <Card className="bg-[var(--kw-primary-50)]/70 dark:bg-[var(--kw-dark-bg)]/80 border border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]">
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {form.t('assets.capabilities.accessPolicy')}
              </h3>
              <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {form.t('assets.capabilities.accessPolicyDesc')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <PolicyButton
                value="all_access_tokens"
                active={form.capabilityForm.access_mode === 'all_access_tokens'}
                onSelect={form.setAccessMode}
                label={form.t('assets.capabilities.allTokens')}
              />
              <PolicyButton
                value="specific_access_tokens"
                active={form.capabilityForm.access_mode === 'specific_access_tokens'}
                onSelect={form.setAccessMode}
                label={form.t('assets.capabilities.specificTokens')}
              />
              <PolicyButton
                value="access_token_label"
                active={form.capabilityForm.access_mode === 'access_token_label'}
                onSelect={form.setAccessMode}
                label={form.t('assets.capabilities.byTokenLabel')}
              />
            </div>

            {form.capabilityForm.access_mode === 'specific_access_tokens' ? (
              <div className="grid gap-3 md:grid-cols-2">
                {page.allTokens.length === 0 ? (
                  <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {form.t('assets.capabilities.noTokens')}
                  </p>
                ) : (
                  page.allTokens.map((token) => (
                    <CapabilityTokenCheckbox
                      key={token.id}
                      token={token}
                      checked={form.capabilityForm.access_token_ids.includes(token.id)}
                      onToggle={form.toggleCapabilityAccessToken}
                    />
                  ))
                )}
              </div>
            ) : null}

            {form.capabilityForm.access_mode === 'access_token_label' ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="token-label-key"
                    className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
                  >
                    {form.t('assets.capabilities.labelKey')}
                  </label>
                  <select
                    id="token-label-key"
                    className={selectClassName}
                    value={form.capabilityForm.label_key}
                    onChange={(event) =>
                      form.setCapabilityForm((current) => ({
                        ...current,
                        label_key: event.target.value,
                        label_values: [],
                      }))
                    }
                  >
                    <option value="">{form.t('assets.capabilities.selectLabelKey')}</option>
                    {Object.keys(page.tokenLabelOptions).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {form.capabilityForm.label_key &&
                  (page.tokenLabelOptions[form.capabilityForm.label_key] ?? []).length > 0 ? (
                    page.tokenLabelOptions[form.capabilityForm.label_key].map((value) => (
                      <CapabilityLabelCheckbox
                        key={value}
                        value={value}
                        labelKey={form.capabilityForm.label_key}
                        checked={form.capabilityForm.label_values.includes(value)}
                        onToggle={form.toggleCapabilityLabelValue}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      {Object.keys(page.tokenLabelOptions).length === 0
                        ? form.t('assets.capabilities.noLabelsAvailable')
                        : form.t('assets.capabilities.selectLabelKeyFirst')}
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={form.closeCapabilityModal}>
            {form.t('common.cancel')}
          </Button>
          <Button type="submit" loading={form.submittingCapability}>
            {form.t('assets.capabilities.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PolicyButton<T extends string>({
  active,
  value,
  onSelect,
  label,
}: {
  active: boolean;
  value: T;
  onSelect: (value: T) => void;
  label: string;
}) {
  const handleClick = useCallback(() => {
    onSelect(value);
  }, [onSelect, value]);

  return (
    <button
      type="button"
      aria-pressed={active}
      className={policyButtonClass(active)}
      onClick={handleClick}
    >
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="dark:bg-[var(--kw-dark-bg)]/60 border border-dashed border-[var(--kw-primary-200)] bg-white/70 text-center dark:border-[var(--kw-dark-border)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-500)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {description}
      </p>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--kw-surface-alt)]/80 dark:bg-[var(--kw-dark-surface)]/80 rounded-2xl px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {value}
      </p>
    </div>
  );
}

function CapabilityTokenCheckbox({
  token,
  checked,
  onToggle,
}: {
  token: { id: string; label: string; agentName: string; status: string };
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useI18n();
  const handleChange = useCallback(() => {
    onToggle(token.id);
  }, [onToggle, token.id]);

  return (
    <label className="dark:bg-[var(--kw-dark-surface)]/80 flex items-start gap-3 rounded-2xl border border-[var(--kw-border)] bg-white/80 px-4 py-3 text-sm text-[var(--kw-text)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="mt-1 h-4 w-4 rounded border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] focus:ring-[var(--kw-primary-400)]"
      />
      <span className="space-y-1">
        <span className="block font-medium">{token.label}</span>
        <span className="block text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {token.agentName} · {translateTokenStatus(t, token.status)}
        </span>
      </span>
    </label>
  );
}

function CapabilityLabelCheckbox({
  value,
  labelKey,
  checked,
  onToggle,
}: {
  value: string;
  labelKey: string;
  checked: boolean;
  onToggle: (value: string) => void;
}) {
  const handleChange = useCallback(() => {
    onToggle(value);
  }, [onToggle, value]);

  return (
    <label className="dark:bg-[var(--kw-dark-surface)]/80 flex items-start gap-3 rounded-2xl border border-[var(--kw-border)] bg-white/80 px-4 py-3 text-sm text-[var(--kw-text)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="mt-1 h-4 w-4 rounded border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] focus:ring-[var(--kw-primary-400)]"
      />
      <span className="space-y-1">
        <span className="block font-medium">{value}</span>
        <span className="block text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {labelKey} = {value}
        </span>
      </span>
    </label>
  );
}

function policyButtonClass(active: boolean) {
  return [
    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
    active
      ? 'border-[var(--kw-primary-400)] bg-[var(--kw-primary-500)] text-white'
      : 'border-[var(--kw-primary-200)] bg-white text-[var(--kw-text)] hover:bg-[var(--kw-primary-50)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)]',
  ].join(' ');
}

function statusVariant(status: string) {
  if (status === 'active' || status === 'approved') {
    return 'success' as const;
  }
  if (status === 'pending_review') {
    return 'warning' as const;
  }
  if (status === 'rejected') {
    return 'error' as const;
  }
  return 'secondary' as const;
}

function formatAccessPolicy(
  capability: GovernedCapability,
  tokenNameById: Record<string, string>,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  if (capability.access_policy.mode === 'all_access_tokens') {
    return t('assets.capabilities.allTokens');
  }

  return capability.access_policy.selectors
    .map((selector) => {
      if (selector.kind === 'access_token') {
        return t('assets.capabilities.accessPolicyToken', {
          items: (selector.ids ?? [])
            .map((tokenId) => tokenNameById[tokenId] ?? tokenId)
            .join(', '),
        });
      }
      return t('assets.capabilities.accessPolicyLabel', {
        key: selector.key ?? t('common.unknown'),
        values: (selector.values ?? []).join(', '),
      });
    })
    .join(' | ');
}
