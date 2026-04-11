'use client';

import { FormEvent, useMemo, useState, memo } from 'react';
import { Cpu, KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Layout } from '@/interfaces/human/layout';
import { useI18n } from '@/components/i18n-provider';
import { ApiError } from '@/lib/api-client';
import { readFocusedEntry } from '@/lib/focused-entry';
import {
  ManagementForbiddenAlert,
  isUnauthorizedError,
  ManagementSessionExpiredAlert,
  ManagementSessionRecoveryNotice,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { useAgentsWithTokens } from '@/domains/identity';
import {
  deriveGovernanceStatus,
  governanceStatusLabel,
  isGovernanceInventoryActive,
  useCapabilities,
  useCreateCapability,
  useCreateSecret,
  useSecrets,
  type GovernedCapability,
} from '@/domains/governance';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Input } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';
import { cn } from '@/lib/utils';

type FlattenedToken = {
  id: string;
  label: string;
  agentId: string;
  agentName: string;
  status: string;
  labels: Record<string, string>;
};

type AccessComposerMode = 'all_tokens' | 'specific_tokens' | 'specific_agents' | 'token_label';

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
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const {
    agents,
    tokensByAgent,
    isLoading: tokensLoading,
    error: tokensError,
    mutate: mutateTokens,
  } = useAgentsWithTokens();
  const secretsQuery = useSecrets();
  const capabilitiesQuery = useCapabilities();
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([tokensError, secretsQuery.error, capabilitiesQuery.error]);
  const createSecret = useCreateSecret();
  const createCapability = useCreateCapability();

  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [selectedPublicationFilter, setSelectedPublicationFilter] = useState<
    'all' | 'pending_review' | 'active'
  >('all');
  const [selectedResourceFilter, setSelectedResourceFilter] = useState<
    'all' | 'secrets' | 'capabilities'
  >(() => {
    if (focus.resourceKind === 'secret') {
      return 'secrets';
    }
    if (focus.resourceKind === 'capability') {
      return 'capabilities';
    }
    return 'all';
  });
  const [submittingSecret, setSubmittingSecret] = useState(false);
  const [submittingCapability, setSubmittingCapability] = useState(false);
  const [secretForm, setSecretForm] = useState({
    display_name: '',
    kind: 'api_token',
    value: '',
    provider: 'openai',
    environment: '',
    provider_scopes: '',
    resource_selector: '',
  });
  const [capabilityForm, setCapabilityForm] = useState({
    name: '',
    secret_id: '',
    risk_level: 'medium',
    allowed_mode: 'proxy_or_lease',
    lease_ttl_seconds: '120',
    required_provider: '',
    required_provider_scopes: '',
    access_mode: 'all_tokens' as AccessComposerMode,
    token_ids: [] as string[],
    agent_ids: [] as string[],
    label_key: '',
    label_values: [] as string[],
  });

  const secrets = secretsQuery.data?.items ?? [];
  const capabilities = capabilitiesQuery.data?.items ?? [];
  const allTokens = useMemo<FlattenedToken[]>(
    () =>
      agents.flatMap((agent) =>
        (tokensByAgent[agent.id] ?? []).map((token) => ({
          id: token.id,
          label: token.displayName ?? token.id,
          agentId: agent.id,
          agentName: agent.name,
          status: token.status,
          labels: token.labels ?? {},
        }))
      ),
    [agents, tokensByAgent]
  );
  const tokenNameById = useMemo(
    () =>
      Object.fromEntries(
        allTokens.map((token) => [token.id, `${token.label} · ${token.agentName}`])
      ),
    [allTokens]
  );
  const agentNameById = useMemo(
    () => Object.fromEntries(agents.map((agent) => [agent.id, agent.name])),
    [agents]
  );
  const tokenLabelOptions = useMemo(() => {
    const valuesByKey = new Map<string, Set<string>>();
    for (const token of allTokens) {
      for (const [key, value] of Object.entries(token.labels)) {
        if (!value) {
          continue;
        }
        const bucket = valuesByKey.get(key) ?? new Set<string>();
        bucket.add(value);
        valuesByKey.set(key, bucket);
      }
    }
    return Object.fromEntries(
      Array.from(valuesByKey.entries()).map(([key, values]) => [key, Array.from(values).sort()])
    ) as Record<string, string[]>;
  }, [allTokens]);

  const loading =
    gateLoading || tokensLoading || secretsQuery.isLoading || capabilitiesQuery.isLoading;
  const combinedError =
    gateError ??
    error ??
    (tokensError instanceof Error && !isUnauthorizedError(tokensError)
      ? tokensError.message
      : null) ??
    (secretsQuery.error instanceof Error && !isUnauthorizedError(secretsQuery.error)
      ? secretsQuery.error.message
      : null) ??
    (capabilitiesQuery.error instanceof Error && !isUnauthorizedError(capabilitiesQuery.error)
      ? capabilitiesQuery.error.message
      : null);

  const restrictedCapabilities = capabilities.filter(
    (capability) => capability.access_policy.mode === 'selectors'
  ).length;
  const activeTokens = allTokens.filter((token) => token.status === 'active').length;
  const pendingReviewItems =
    secrets.filter((secret) => deriveGovernanceStatus(secret) === 'pending_review').length +
    capabilities.filter((capability) => deriveGovernanceStatus(capability) === 'pending_review')
      .length;
  const activeAssets =
    secrets.filter((secret) => isGovernanceInventoryActive(deriveGovernanceStatus(secret))).length +
    capabilities.filter((capability) =>
      isGovernanceInventoryActive(deriveGovernanceStatus(capability))
    ).length;
  const visibleSecrets = secrets.filter((secret) => {
    const governanceStatus = deriveGovernanceStatus(secret);
    if (selectedResourceFilter === 'capabilities') {
      return false;
    }
    if (selectedPublicationFilter === 'pending_review' && governanceStatus !== 'pending_review') {
      return false;
    }
    if (selectedPublicationFilter === 'active' && !isGovernanceInventoryActive(governanceStatus)) {
      return false;
    }
    return true;
  });
  const visibleCapabilities = capabilities.filter((capability) => {
    const governanceStatus = deriveGovernanceStatus(capability);
    if (selectedResourceFilter === 'secrets') {
      return false;
    }
    if (selectedPublicationFilter === 'pending_review' && governanceStatus !== 'pending_review') {
      return false;
    }
    if (selectedPublicationFilter === 'active' && !isGovernanceInventoryActive(governanceStatus)) {
      return false;
    }
    return true;
  });
  const focusedSecret =
    secrets.find((secret) => focus.resourceKind === 'secret' && secret.id === focus.resourceId) ??
    null;
  const focusedCapability =
    capabilities.find(
      (capability) => focus.resourceKind === 'capability' && capability.id === focus.resourceId
    ) ?? null;
  const focusedAsset = focusedSecret ?? focusedCapability;

  async function handleRefresh() {
    setError(null);
    setRefreshError(null);
    setIsRefreshing(true);
    clearAllAuthErrors();

    try {
      await Promise.all([secretsQuery.mutate(), capabilitiesQuery.mutate(), mutateTokens()]);
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }

      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : t('assets.errors.refreshFailed')
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCreateSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingSecret(true);
    setError(null);
    clearAllAuthErrors();

    try {
      const created = await createSecret({
        display_name: secretForm.display_name.trim(),
        kind: secretForm.kind.trim(),
        value: secretForm.value,
        provider: secretForm.provider.trim(),
        environment: secretForm.environment.trim() || null,
        provider_scopes: parseCommaSeparatedList(secretForm.provider_scopes),
        resource_selector: secretForm.resource_selector.trim() || null,
      });
      setSecretForm({
        display_name: '',
        kind: 'api_token',
        value: '',
        provider: 'openai',
        environment: '',
        provider_scopes: '',
        resource_selector: '',
      });
      setCapabilityForm((current) => ({
        ...current,
        secret_id: created.id,
        required_provider: created.provider ?? current.required_provider,
        required_provider_scopes: (created.provider_scopes ?? []).join(', '),
      }));
      setShowSecretModal(false);
    } catch (submitError) {
      if (consumeUnauthorized(submitError)) {
        return;
      }

      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(
          submitError instanceof Error ? submitError.message : t('assets.secrets.createFailed')
        );
      }
    } finally {
      setSubmittingSecret(false);
    }
  }

  async function handleCreateCapability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilityForm.secret_id) {
      setError(t('assets.capabilities.selectSecretError'));
      return;
    }
    if (capabilityForm.access_mode === 'specific_tokens' && capabilityForm.token_ids.length === 0) {
      setError(t('assets.capabilities.tokenRequiredError'));
      return;
    }
    if (capabilityForm.access_mode === 'specific_agents' && capabilityForm.agent_ids.length === 0) {
      setError(t('assets.capabilities.agentRequiredError'));
      return;
    }
    if (
      capabilityForm.access_mode === 'token_label' &&
      (!capabilityForm.label_key || capabilityForm.label_values.length === 0)
    ) {
      setError(t('assets.capabilities.labelRequiredError'));
      return;
    }

    setSubmittingCapability(true);
    setError(null);
    clearAllAuthErrors();

    try {
      await createCapability({
        name: capabilityForm.name.trim(),
        secret_id: capabilityForm.secret_id,
        risk_level: capabilityForm.risk_level,
        allowed_mode: capabilityForm.allowed_mode,
        lease_ttl_seconds: Number(capabilityForm.lease_ttl_seconds) || 60,
        required_provider: capabilityForm.required_provider.trim() || null,
        required_provider_scopes: parseCommaSeparatedList(capabilityForm.required_provider_scopes),
        access_policy: buildCapabilityAccessPolicy(capabilityForm),
      });
      setCapabilityForm({
        name: '',
        secret_id: capabilityForm.secret_id,
        risk_level: 'medium',
        allowed_mode: 'proxy_or_lease',
        lease_ttl_seconds: '120',
        required_provider: '',
        required_provider_scopes: '',
        access_mode: 'all_tokens',
        token_ids: [],
        agent_ids: [],
        label_key: '',
        label_values: [],
      });
      setShowCapabilityModal(false);
    } catch (submitError) {
      if (consumeUnauthorized(submitError)) {
        return;
      }

      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(submitError instanceof Error ? submitError.message : '创建 capability 失败');
      }
    } finally {
      setSubmittingCapability(false);
    }
  }

  function handleCapabilitySecretChange(secretId: string) {
    const secret = secrets.find((item) => item.id === secretId);
    setCapabilityForm((current) => ({
      ...current,
      secret_id: secretId,
      required_provider: secret?.provider ?? current.required_provider,
      required_provider_scopes:
        current.required_provider_scopes || (secret?.provider_scopes ?? []).join(', '),
    }));
  }

  function toggleCapabilityToken(tokenId: string) {
    setCapabilityForm((current) => ({
      ...current,
      token_ids: current.token_ids.includes(tokenId)
        ? current.token_ids.filter((item) => item !== tokenId)
        : [...current.token_ids, tokenId],
    }));
  }

  function toggleCapabilityAgent(agentId: string) {
    setCapabilityForm((current) => ({
      ...current,
      agent_ids: current.agent_ids.includes(agentId)
        ? current.agent_ids.filter((item) => item !== agentId)
        : [...current.agent_ids, agentId],
    }));
  }

  function toggleCapabilityLabelValue(value: string) {
    setCapabilityForm((current) => ({
      ...current,
      label_values: current.label_values.includes(value)
        ? current.label_values.filter((item) => item !== value)
        : [...current.label_values, value],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="dark:bg-[var(--kw-dark-surface)]/80 inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 px-4 py-2 text-sm text-[var(--kw-primary-600)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
            <ShieldCheck className="h-4 w-4" />
            {t('assets.subtitle')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('assets.title')}
            </h1>
            <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('assets.description')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button variant="secondary" onClick={() => setShowSecretModal(true)}>
            <LockKeyhole className="mr-2 h-4 w-4" />
            {t('assets.newSecret')}
          </Button>
          <Button onClick={() => setShowCapabilityModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('assets.newCapability')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('assets.metrics.secrets')}
          value={secrets.length.toString()}
          hint={t('assets.metrics.secretsHint')}
        />
        <MetricCard
          label={t('assets.metrics.capabilities')}
          value={capabilities.length.toString()}
          hint={t('assets.metrics.capabilitiesHint')}
        />
        <MetricCard
          label={t('assets.metrics.restricted')}
          value={restrictedCapabilities.toString()}
          hint={t('assets.metrics.restrictedHint')}
        />
        <MetricCard
          label={t('assets.metrics.activeTokens')}
          value={activeTokens.toString()}
          hint={`${allTokens.length} ${t('common.total')}`}
        />
      </div>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              Governance inventory
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              Review what agents are trying to publish, what has already gone live, and which
              resource lane needs human attention next.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            <Badge variant="warning">{pendingReviewItems} pending review items</Badge>
            <Badge variant="success">
              {activeAssets} active asset{activeAssets === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                Publication state
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedPublicationFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedPublicationFilter === 'all'}
                  onClick={() => setSelectedPublicationFilter('all')}
                >
                  All states
                </Button>
                <Button
                  variant={selectedPublicationFilter === 'pending_review' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedPublicationFilter === 'pending_review'}
                  onClick={() => setSelectedPublicationFilter('pending_review')}
                >
                  Pending Review
                </Button>
                <Button
                  variant={selectedPublicationFilter === 'active' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedPublicationFilter === 'active'}
                  onClick={() => setSelectedPublicationFilter('active')}
                >
                  Active
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                Resource lane
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedResourceFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedResourceFilter === 'all'}
                  onClick={() => setSelectedResourceFilter('all')}
                >
                  All resources
                </Button>
                <Button
                  variant={selectedResourceFilter === 'secrets' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedResourceFilter === 'secrets'}
                  onClick={() => setSelectedResourceFilter('secrets')}
                >
                  Secrets
                </Button>
                <Button
                  variant={selectedResourceFilter === 'capabilities' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedResourceFilter === 'capabilities'}
                  onClick={() => setSelectedResourceFilter('capabilities')}
                >
                  Capabilities
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <Badge variant="primary">{t('common.operator')}</Badge>
          <span className="dark:text-[var(--kw-dark-text)]">
            {session?.email ?? t('common.loading')}
          </span>
          <span className="text-[var(--kw-border)] dark:text-[var(--kw-dark-border)]">•</span>
          <span>{session?.role ?? '...'}</span>
          <span className="text-[var(--kw-border)] dark:text-[var(--kw-dark-border)]">•</span>
          <span>{t('assets.policyNote')}</span>
        </div>
      </Card>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={t('assets.sessionExpired')} />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t('assets.sessionForbidden')} />
      ) : null}

      {refreshError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
        >
          {refreshError}
        </Card>
      ) : null}

      {!shouldShowForbidden && combinedError ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
        >
          {combinedError}
        </Card>
      ) : null}

      {loading ? (
        <Card className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <span className="animate-spin">🌸</span>
          {t('assets.loading')}
        </Card>
      ) : null}

      {focusedAsset ? (
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              Focused asset
            </p>
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {'display_name' in focusedAsset ? focusedAsset.display_name : focusedAsset.name}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {focus.resourceKind} · {focusedAsset.id}
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card
          variant="feature"
          className="space-y-4 dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-rose-surface)] px-3 py-1 text-sm text-[var(--kw-rose-text)]">
                <KeyRound className="h-4 w-4" />
                {t('assets.secrets.inventory')}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {t('assets.secrets.title')}
              </h2>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {t('assets.secrets.description')}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setShowSecretModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('common.new')}
            </Button>
          </div>

          <div className="space-y-3">
            {!shouldShowSessionExpired && visibleSecrets.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-8 w-8" />}
                title={
                  selectedResourceFilter === 'capabilities'
                    ? t('assets.secretsHiddenTitle')
                    : t('assets.secrets.emptyTitle')
                }
                description={
                  selectedResourceFilter === 'capabilities'
                    ? t('assets.secretsHiddenDesc')
                    : selectedPublicationFilter === 'all'
                      ? t('assets.secrets.emptyDesc')
                      : t('assets.noSecretsFilter')
                }
              />
            ) : shouldShowSessionExpired && isUnauthorizedError(secretsQuery.error) ? (
              <ManagementSessionRecoveryNotice message={t('assets.secrets.reloadInventory')} />
            ) : (
              visibleSecrets.map((secret) => (
                <Card
                  key={secret.id}
                  data-testid={`secret-card-${secret.id}`}
                  data-focus-state={
                    focus.resourceKind === 'secret' && focus.resourceId === secret.id
                      ? 'focused'
                      : 'default'
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
                        Governance state: {governanceStatusLabel(deriveGovernanceStatus(secret))}
                      </p>
                    </div>
                    <Badge variant={statusVariant(deriveGovernanceStatus(secret))}>
                      {governanceStatusLabel(deriveGovernanceStatus(secret))}
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
              ))
            )}
          </div>
        </Card>

        <Card
          variant="feature"
          className="space-y-4 dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--kw-purple-surface)] px-3 py-1 text-sm text-[var(--kw-purple-text)]">
                <Cpu className="h-4 w-4" />
                {t('assets.capabilities.access')}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {t('assets.capabilities.title')}
              </h2>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {t('assets.capabilities.description')}
              </p>
            </div>
            <Button onClick={() => setShowCapabilityModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建
            </Button>
          </div>

          <div className="space-y-3">
            {!shouldShowSessionExpired && visibleCapabilities.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-8 w-8" />}
                title={
                  selectedResourceFilter === 'secrets'
                    ? t('assets.capabilitiesHiddenTitle')
                    : t('assets.capabilities.emptyTitle')
                }
                description={
                  selectedResourceFilter === 'secrets'
                    ? t('assets.capabilitiesHiddenDesc')
                    : selectedPublicationFilter === 'all'
                      ? t('assets.capabilities.emptyDesc')
                      : t('assets.noCapabilitiesFilter')
                }
              />
            ) : shouldShowSessionExpired && isUnauthorizedError(capabilitiesQuery.error) ? (
              <ManagementSessionRecoveryNotice message={t('assets.capabilities.reloadPolicy')} />
            ) : (
              visibleCapabilities.map((capability) => (
                <Card
                  key={capability.id}
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
                        Secret {capability.secret_id} · {capability.allowed_mode} · risk{' '}
                        {capability.risk_level}
                      </p>
                      <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                        Governance state:{' '}
                        {governanceStatusLabel(deriveGovernanceStatus(capability))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant(deriveGovernanceStatus(capability))}>
                        {governanceStatusLabel(deriveGovernanceStatus(capability))}
                      </Badge>
                      <Badge
                        variant={
                          capability.access_policy.mode === 'all_tokens' ? 'success' : 'warning'
                        }
                      >
                        {capability.access_policy.mode === 'all_tokens'
                          ? t('assets.capabilities.allTokens')
                          : '定向访问'}
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
                      value={
                        capability.required_provider_scopes.join(', ') || t('common.notSpecified')
                      }
                    />
                    <InfoBlock
                      label={t('assets.capabilities.leaseTTL')}
                      value={`${capability.lease_ttl_seconds}s`}
                    />
                    <InfoBlock
                      label={t('assets.capabilities.tokenAccess')}
                      value={formatAccessPolicy(capability, tokenNameById, agentNameById)}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        title={t('assets.secrets.modalTitle')}
        description={t('assets.secrets.modalDesc')}
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleCreateSecret}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('assets.secrets.displayName')}
              value={secretForm.display_name}
              onChange={(event) =>
                setSecretForm((current) => ({ ...current, display_name: event.target.value }))
              }
              placeholder={t('assets.secrets.providerPlaceholder')}
            />
            <Input
              label={t('assets.secrets.kind')}
              value={secretForm.kind}
              onChange={(event) =>
                setSecretForm((current) => ({ ...current, kind: event.target.value }))
              }
              placeholder={t('assets.secrets.kindPlaceholder')}
            />
            <Input
              label={t('assets.secrets.provider')}
              value={secretForm.provider}
              onChange={(event) =>
                setSecretForm((current) => ({ ...current, provider: event.target.value }))
              }
              placeholder={t('assets.secrets.providerPlaceholderShort')}
            />
            <Input
              label={t('assets.secrets.environment')}
              value={secretForm.environment}
              onChange={(event) =>
                setSecretForm((current) => ({ ...current, environment: event.target.value }))
              }
              placeholder={t('assets.secrets.environmentPlaceholder')}
            />
          </div>
          <Input
            label={t('assets.secrets.value')}
            type="password"
            value={secretForm.value}
            onChange={(event) =>
              setSecretForm((current) => ({ ...current, value: event.target.value }))
            }
            placeholder={t('assets.secrets.valuePlaceholder')}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('assets.secrets.providerScopes')}
              value={secretForm.provider_scopes}
              onChange={(event) =>
                setSecretForm((current) => ({ ...current, provider_scopes: event.target.value }))
              }
              placeholder={t('assets.secrets.scopesPlaceholder')}
            />
            <Input
              label={t('assets.secrets.resourceSelector')}
              value={secretForm.resource_selector}
              onChange={(event) =>
                setSecretForm((current) => ({ ...current, resource_selector: event.target.value }))
              }
              placeholder={t('assets.secrets.resourceSelectorPlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowSecretModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={submittingSecret}>
              {t('assets.secrets.create')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showCapabilityModal}
        onClose={() => setShowCapabilityModal(false)}
        title={t('assets.capabilities.modalTitle')}
        description={t('assets.capabilities.modalDesc')}
        size="xl"
      >
        <form className="space-y-5" onSubmit={handleCreateCapability}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('assets.capabilities.name')}
              value={capabilityForm.name}
              onChange={(event) =>
                setCapabilityForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={t('assets.secrets.displayNamePlaceholder')}
            />
            <div className="space-y-1.5">
              <label
                htmlFor="capability-secret"
                className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
              >
                {t('assets.capabilities.bindSecret')}
              </label>
              <select
                id="capability-secret"
                className={selectClassName}
                value={capabilityForm.secret_id}
                onChange={(event) => handleCapabilitySecretChange(event.target.value)}
              >
                <option value="">{t('assets.capabilities.selectSecret')}</option>
                {secrets.map((secret) => (
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
                {t('assets.capabilities.riskLevel')}
              </label>
              <select
                id="capability-risk"
                className={selectClassName}
                value={capabilityForm.risk_level}
                onChange={(event) =>
                  setCapabilityForm((current) => ({ ...current, risk_level: event.target.value }))
                }
              >
                <option value="low">{t('assets.capabilities.riskLevelLow')}</option>
                <option value="medium">{t('assets.capabilities.riskLevelMedium')}</option>
                <option value="high">{t('assets.capabilities.riskLevelHigh')}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="capability-mode"
                className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
              >
                {t('assets.capabilities.allowedMode')}
              </label>
              <select
                id="capability-mode"
                className={selectClassName}
                value={capabilityForm.allowed_mode}
                onChange={(event) =>
                  setCapabilityForm((current) => ({ ...current, allowed_mode: event.target.value }))
                }
              >
                <option value="proxy_only">{t('assets.capabilities.modeProxyOnly')}</option>
                <option value="proxy_or_lease">{t('assets.capabilities.modeProxyOrLease')}</option>
              </select>
            </div>
            <Input
              label={t('assets.capabilities.leaseTTL')}
              type="number"
              value={capabilityForm.lease_ttl_seconds}
              onChange={(event) =>
                setCapabilityForm((current) => ({
                  ...current,
                  lease_ttl_seconds: event.target.value,
                }))
              }
            />
            <Input
              label={t('assets.capabilities.requiredProvider')}
              value={capabilityForm.required_provider}
              onChange={(event) =>
                setCapabilityForm((current) => ({
                  ...current,
                  required_provider: event.target.value,
                }))
              }
              placeholder={t('assets.secrets.providerPlaceholderShort')}
            />
            <Input
              label={t('assets.capabilities.requiredScopes')}
              value={capabilityForm.required_provider_scopes}
              onChange={(event) =>
                setCapabilityForm((current) => ({
                  ...current,
                  required_provider_scopes: event.target.value,
                }))
              }
              placeholder={t('assets.secrets.scopesPlaceholder')}
            />
          </div>

          <Card className="bg-[var(--kw-primary-50)]/70 dark:bg-[var(--kw-dark-bg)]/80 border border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('assets.capabilities.accessPolicy')}
                </h3>
                <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('assets.capabilities.accessPolicyDesc')}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  aria-pressed={capabilityForm.access_mode === 'all_tokens'}
                  className={policyButtonClass(capabilityForm.access_mode === 'all_tokens')}
                  onClick={() =>
                    setCapabilityForm((current) => ({
                      ...current,
                      access_mode: 'all_tokens',
                      token_ids: [],
                      agent_ids: [],
                      label_key: '',
                      label_values: [],
                    }))
                  }
                >
                  {t('assets.capabilities.allTokens')}
                </button>
                <button
                  type="button"
                  aria-pressed={capabilityForm.access_mode === 'specific_tokens'}
                  className={policyButtonClass(capabilityForm.access_mode === 'specific_tokens')}
                  onClick={() =>
                    setCapabilityForm((current) => ({
                      ...current,
                      access_mode: 'specific_tokens',
                      agent_ids: [],
                      label_key: '',
                      label_values: [],
                    }))
                  }
                >
                  指定 token
                </button>
                <button
                  type="button"
                  aria-pressed={capabilityForm.access_mode === 'specific_agents'}
                  className={policyButtonClass(capabilityForm.access_mode === 'specific_agents')}
                  onClick={() =>
                    setCapabilityForm((current) => ({
                      ...current,
                      access_mode: 'specific_agents',
                      token_ids: [],
                      label_key: '',
                      label_values: [],
                    }))
                  }
                >
                  指定 agent
                </button>
                <button
                  type="button"
                  aria-pressed={capabilityForm.access_mode === 'token_label'}
                  className={policyButtonClass(capabilityForm.access_mode === 'token_label')}
                  onClick={() =>
                    setCapabilityForm((current) => ({
                      ...current,
                      access_mode: 'token_label',
                      token_ids: [],
                      agent_ids: [],
                    }))
                  }
                >
                  按 token 标签
                </button>
              </div>

              {capabilityForm.access_mode === 'specific_tokens' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {allTokens.length === 0 ? (
                    <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      {t('assets.capabilities.noTokens')}
                    </p>
                  ) : (
                    allTokens.map((token) => (
                      <label
                        key={token.id}
                        className="dark:bg-[var(--kw-dark-surface)]/80 flex items-start gap-3 rounded-2xl border border-[var(--kw-border)] bg-white/80 px-4 py-3 text-sm text-[var(--kw-text)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)]"
                      >
                        <input
                          type="checkbox"
                          checked={capabilityForm.token_ids.includes(token.id)}
                          onChange={() => toggleCapabilityToken(token.id)}
                          className="mt-1 h-4 w-4 rounded border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] focus:ring-[var(--kw-primary-400)]"
                        />
                        <span className="space-y-1">
                          <span className="block font-medium">{token.label}</span>
                          <span className="block text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                            {token.agentName} · {token.status}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              ) : null}

              {capabilityForm.access_mode === 'specific_agents' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {agents.length === 0 ? (
                    <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      还没有可选 agent，请先创建 agent。
                    </p>
                  ) : (
                    agents.map((agent) => (
                      <label
                        key={agent.id}
                        className="dark:bg-[var(--kw-dark-surface)]/80 flex items-start gap-3 rounded-2xl border border-[var(--kw-border)] bg-white/80 px-4 py-3 text-sm text-[var(--kw-text)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)]"
                      >
                        <input
                          type="checkbox"
                          checked={capabilityForm.agent_ids.includes(agent.id)}
                          onChange={() => toggleCapabilityAgent(agent.id)}
                          className="mt-1 h-4 w-4 rounded border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] focus:ring-[var(--kw-primary-400)]"
                        />
                        <span className="space-y-1">
                          <span className="block font-medium">{agent.name}</span>
                          <span className="block text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                            {agent.id} · {agent.status}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              ) : null}

              {capabilityForm.access_mode === 'token_label' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="token-label-key"
                      className="block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
                    >
                      标签键
                    </label>
                    <select
                      id="token-label-key"
                      className={selectClassName}
                      value={capabilityForm.label_key}
                      onChange={(event) =>
                        setCapabilityForm((current) => ({
                          ...current,
                          label_key: event.target.value,
                          label_values: [],
                        }))
                      }
                    >
                      <option value="">选择一个 token 标签键</option>
                      {Object.keys(tokenLabelOptions).map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {capabilityForm.label_key &&
                    (tokenLabelOptions[capabilityForm.label_key] ?? []).length > 0 ? (
                      tokenLabelOptions[capabilityForm.label_key].map((value) => (
                        <label
                          key={value}
                          className="dark:bg-[var(--kw-dark-surface)]/80 flex items-start gap-3 rounded-2xl border border-[var(--kw-border)] bg-white/80 px-4 py-3 text-sm text-[var(--kw-text)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)]"
                        >
                          <input
                            type="checkbox"
                            checked={capabilityForm.label_values.includes(value)}
                            onChange={() => toggleCapabilityLabelValue(value)}
                            className="mt-1 h-4 w-4 rounded border-[var(--kw-primary-300)] text-[var(--kw-primary-500)] focus:ring-[var(--kw-primary-400)]"
                          />
                          <span className="space-y-1">
                            <span className="block font-medium">{value}</span>
                            <span className="block text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                              {capabilityForm.label_key} = {value}
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                        {Object.keys(tokenLabelOptions).length === 0
                          ? '当前 token 还没有标签，无法按标签限制。'
                          : '先选择一个标签键，再勾选允许的值。'}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCapabilityModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={submittingCapability}>
              {t('assets.capabilities.create')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
});

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
      <div className="space-y-2">
        <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {label}
        </p>
        <p className="text-3xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
          {value}
        </p>
        <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {hint}
        </p>
      </div>
    </Card>
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

function parseCommaSeparatedList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
  agentNameById: Record<string, string>
) {
  if (capability.access_policy.mode === 'all_tokens') {
    return '所有 token';
  }

  return capability.access_policy.selectors
    .map((selector) => {
      if (selector.kind === 'token') {
        return `Token: ${(selector.ids ?? []).map((tokenId) => tokenNameById[tokenId] ?? tokenId).join(', ')}`;
      }
      if (selector.kind === 'agent') {
        return `Agent: ${(selector.ids ?? []).map((agentId) => agentNameById[agentId] ?? agentId).join(', ')}`;
      }
      return `Label: ${selector.key} = ${(selector.values ?? []).join(', ')}`;
    })
    .join(' | ');
}

function policyButtonClass(active: boolean) {
  return [
    'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
    active
      ? 'border-[var(--kw-primary-400)] bg-[var(--kw-primary-500)] text-white'
      : 'border-[var(--kw-primary-200)] bg-white text-[var(--kw-text)] hover:bg-[var(--kw-primary-50)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text)]',
  ].join(' ');
}

function buildCapabilityAccessPolicy(form: {
  access_mode: AccessComposerMode;
  token_ids: string[];
  agent_ids: string[];
  label_key: string;
  label_values: string[];
}) {
  if (form.access_mode === 'all_tokens') {
    return {
      mode: 'all_tokens' as const,
      selectors: [],
    };
  }

  if (form.access_mode === 'specific_tokens') {
    return {
      mode: 'selectors' as const,
      selectors: [
        {
          kind: 'token' as const,
          ids: form.token_ids,
        },
      ],
    };
  }

  if (form.access_mode === 'specific_agents') {
    return {
      mode: 'selectors' as const,
      selectors: [
        {
          kind: 'agent' as const,
          ids: form.agent_ids,
        },
      ],
    };
  }

  return {
    mode: 'selectors' as const,
    selectors: [
      {
        kind: 'token_label' as const,
        key: form.label_key,
        values: form.label_values,
      },
    ],
  };
}
