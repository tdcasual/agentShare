'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Cpu, KeyRound, LockKeyhole, Plus, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

import { Layout } from '@/interfaces/human/layout';
import { useI18n } from '@/components/i18n-provider';
import { ApiError } from '@/lib/api-client';
import {
  isUnauthorizedError,
  ManagementSessionExpiredAlert,
  ManagementSessionRecoveryNotice,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { useAgentsWithTokens } from '@/domains/identity';
import {
  useCapabilities,
  useCreateCapability,
  useCreateSecret,
  useSecrets,
  type GovernedCapability,
  type GovernedSecret,
} from '@/domains/governance';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Input } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';

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
  'w-full rounded-2xl border-2 border-pink-100 bg-white px-4 py-3 text-base text-gray-700 outline-none transition-all duration-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]';

export default function AssetsPage() {
  return (
    <Layout>
      <AssetsContent />
    </Layout>
  );
}

function AssetsContent() {
  const { t } = useI18n();
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
    shouldShowSessionExpired,
    clearSessionExpired,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([
    tokensError,
    secretsQuery.error,
    capabilitiesQuery.error,
  ]);
  const createSecret = useCreateSecret();
  const createCapability = useCreateCapability();

  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
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
          label: token.display_name ?? token.displayName ?? token.id,
          agentId: agent.id,
          agentName: agent.name,
          status: token.status,
          labels: token.labels ?? {},
        })),
      ),
    [agents, tokensByAgent],
  );
  const tokenNameById = useMemo(
    () => Object.fromEntries(allTokens.map((token) => [token.id, `${token.label} · ${token.agentName}`])),
    [allTokens],
  );
  const agentNameById = useMemo(
    () => Object.fromEntries(agents.map((agent) => [agent.id, agent.name])),
    [agents],
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
      Array.from(valuesByKey.entries()).map(([key, values]) => [key, Array.from(values).sort()]),
    ) as Record<string, string[]>;
  }, [allTokens]);

  const loading = gateLoading || tokensLoading || secretsQuery.isLoading || capabilitiesQuery.isLoading;
  const combinedError =
    gateError ??
    error ??
    (tokensError instanceof Error && !isUnauthorizedError(tokensError) ? tokensError.message : null) ??
    (secretsQuery.error instanceof Error && !isUnauthorizedError(secretsQuery.error) ? secretsQuery.error.message : null) ??
    (capabilitiesQuery.error instanceof Error && !isUnauthorizedError(capabilitiesQuery.error) ? capabilitiesQuery.error.message : null);

  const restrictedCapabilities = capabilities.filter(
    (capability) => capability.access_policy.mode === 'selectors',
  ).length;
  const activeTokens = allTokens.filter((token) => token.status === 'active').length;

  async function handleRefresh() {
    setError(null);
    setRefreshError(null);
    setIsRefreshing(true);
    clearSessionExpired();

    try {
      await Promise.all([
        secretsQuery.mutate(),
        capabilitiesQuery.mutate(),
        mutateTokens(),
      ]);
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }

      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : 'Failed to refresh governance assets'
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCreateSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingSecret(true);
    setError(null);
    clearSessionExpired();

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
        setError(submitError instanceof Error ? submitError.message : '创建密钥失败');
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
      setError('选择指定 agent 时，至少需要勾选一个 agent。');
      return;
    }
    if (
      capabilityForm.access_mode === 'token_label' &&
      (!capabilityForm.label_key || capabilityForm.label_values.length === 0)
    ) {
      setError('按 token 标签限制时，请选择标签键和值。');
      return;
    }

    setSubmittingCapability(true);
    setError(null);
    clearSessionExpired();

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
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/80 px-4 py-2 text-sm text-pink-700 dark:border-[#3D3D5C] dark:bg-[#252540]/80 dark:text-[#E891C0]">
            <ShieldCheck className="h-4 w-4" />
            {t('assets.subtitle')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{t('assets.title')}</h1>
            <p className="mt-1 text-gray-600 dark:text-[#9CA3AF]">
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
        <MetricCard label={t('assets.metrics.secrets')} value={secrets.length.toString()} hint={t('assets.metrics.secretsHint')} />
        <MetricCard label={t('assets.metrics.capabilities')} value={capabilities.length.toString()} hint={t('assets.metrics.capabilitiesHint')} />
        <MetricCard label={t('assets.metrics.restricted')} value={restrictedCapabilities.toString()} hint={t('assets.metrics.restrictedHint')} />
        <MetricCard label={t('assets.metrics.activeTokens')} value={activeTokens.toString()} hint={`${allTokens.length} ${t('common.total')}`} />
      </div>

      <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
          <Badge variant="primary">{t('common.operator')}</Badge>
          <span className="dark:text-[#E8E8EC]">{session?.email ?? t('common.loading')}</span>
          <span className="text-gray-300 dark:text-[#3D3D5C]">•</span>
          <span>{session?.role ?? '...'}</span>
          <span className="text-gray-300 dark:text-[#3D3D5C]">•</span>
          <span>{t('assets.policyNote')}</span>
        </div>
      </Card>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to continue managing secrets, capabilities, and token access." />
      ) : null}

      {refreshError ? (
        <Card 
          role="alert" 
          aria-live="polite" 
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
        >
          {refreshError}
        </Card>
      ) : null}

      {combinedError ? (
        <Card 
          role="alert" 
          aria-live="assertive" 
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
        >
          {combinedError}
        </Card>
      ) : null}

      {loading ? (
        <Card className="flex items-center gap-3 text-gray-600 dark:text-[#9CA3AF]">
          <span className="animate-spin">🌸</span>
          {t('assets.loading')}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card variant="feature" className="space-y-4 dark:from-[#252540] dark:to-[#2D2D50]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                <KeyRound className="h-4 w-4" />
                {t('assets.secrets.inventory')}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('assets.secrets.title')}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                {t('assets.secrets.description')}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setShowSecretModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('common.new')}
            </Button>
          </div>

          <div className="space-y-3">
            {!shouldShowSessionExpired && secrets.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-8 w-8" />}
                title={t('assets.secrets.emptyTitle')}
                description={t('assets.secrets.emptyDesc')}
              />
            ) : shouldShowSessionExpired && isUnauthorizedError(secretsQuery.error) ? (
              <ManagementSessionRecoveryNotice message="Sign in again to reload the secret inventory." />
            ) : (
              secrets.map((secret) => (
                <Card key={secret.id} className="border border-pink-100/80 bg-white/80 p-5 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/80">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">{secret.display_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                        {secret.provider} · {secret.kind}
                        {secret.environment ? ` · ${secret.environment}` : ''}
                      </p>
                    </div>
                    <Badge variant={statusVariant(secret.publication_status)}>{secret.publication_status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <InfoBlock label={t('assets.secrets.providerScopes')} value={secret.provider_scopes.join(', ') || t('common.notSpecified')} />
                    <InfoBlock label={t('assets.secrets.resourceSelector')} value={secret.resource_selector || t('common.notSpecified')} />
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>

        <Card variant="feature" className="space-y-4 dark:from-[#252540] dark:to-[#2D2D50]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700">
                <Cpu className="h-4 w-4" />
                {t('assets.capabilities.access')}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('assets.capabilities.title')}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                {t('assets.capabilities.description')}
              </p>
            </div>
            <Button onClick={() => setShowCapabilityModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建
            </Button>
          </div>

          <div className="space-y-3">
            {!shouldShowSessionExpired && capabilities.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-8 w-8" />}
                title={t('assets.capabilities.emptyTitle')}
                description={t('assets.capabilities.emptyDesc')}
              />
            ) : shouldShowSessionExpired && isUnauthorizedError(capabilitiesQuery.error) ? (
              <ManagementSessionRecoveryNotice message="Sign in again to reload capability policy data." />
            ) : (
              capabilities.map((capability) => (
                <Card key={capability.id} className="border border-pink-100/80 bg-white/80 p-5 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/80">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">{capability.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                        Secret {capability.secret_id} · {capability.allowed_mode} · risk {capability.risk_level}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusVariant(capability.publication_status)}>{capability.publication_status}</Badge>
                      <Badge variant={capability.access_policy.mode === 'all_tokens' ? 'success' : 'warning'}>
                        {capability.access_policy.mode === 'all_tokens' ? t('assets.capabilities.allTokens') : '定向访问'}
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
              onChange={(event) => setSecretForm((current) => ({ ...current, display_name: event.target.value }))}
              placeholder="OpenAI production key"
            />
            <Input
              label={t('assets.secrets.kind')}
              value={secretForm.kind}
              onChange={(event) => setSecretForm((current) => ({ ...current, kind: event.target.value }))}
              placeholder="api_token"
            />
            <Input
              label={t('assets.secrets.provider')}
              value={secretForm.provider}
              onChange={(event) => setSecretForm((current) => ({ ...current, provider: event.target.value }))}
              placeholder="openai"
            />
            <Input
              label={t('assets.secrets.environment')}
              value={secretForm.environment}
              onChange={(event) => setSecretForm((current) => ({ ...current, environment: event.target.value }))}
              placeholder="production"
            />
          </div>
          <Input
            label={t('assets.secrets.value')}
            type="password"
            value={secretForm.value}
            onChange={(event) => setSecretForm((current) => ({ ...current, value: event.target.value }))}
            placeholder="sk-live-..."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t('assets.secrets.providerScopes')}
              value={secretForm.provider_scopes}
              onChange={(event) => setSecretForm((current) => ({ ...current, provider_scopes: event.target.value }))}
              placeholder="responses.read, responses.write"
            />
            <Input
              label={t('assets.secrets.resourceSelector')}
              value={secretForm.resource_selector}
              onChange={(event) => setSecretForm((current) => ({ ...current, resource_selector: event.target.value }))}
              placeholder="project:agent-share"
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
              onChange={(event) => setCapabilityForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="openai.config.bootstrap"
            />
            <div className="space-y-1.5">
              <label htmlFor="capability-secret" className="block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">{t('assets.capabilities.bindSecret')}</label>
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
              <label htmlFor="capability-risk" className="block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">{t('assets.capabilities.riskLevel')}</label>
              <select
                id="capability-risk"
                className={selectClassName}
                value={capabilityForm.risk_level}
                onChange={(event) => setCapabilityForm((current) => ({ ...current, risk_level: event.target.value }))}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="capability-mode" className="block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">{t('assets.capabilities.allowedMode')}</label>
              <select
                id="capability-mode"
                className={selectClassName}
                value={capabilityForm.allowed_mode}
                onChange={(event) => setCapabilityForm((current) => ({ ...current, allowed_mode: event.target.value }))}
              >
                <option value="proxy_only">proxy_only</option>
                <option value="proxy_or_lease">proxy_or_lease</option>
              </select>
            </div>
            <Input
              label={t('assets.capabilities.leaseTTL')}
              type="number"
              value={capabilityForm.lease_ttl_seconds}
              onChange={(event) => setCapabilityForm((current) => ({ ...current, lease_ttl_seconds: event.target.value }))}
            />
            <Input
              label={t('assets.capabilities.requiredProvider')}
              value={capabilityForm.required_provider}
              onChange={(event) => setCapabilityForm((current) => ({ ...current, required_provider: event.target.value }))}
              placeholder="openai"
            />
            <Input
              label={t('assets.capabilities.requiredScopes')}
              value={capabilityForm.required_provider_scopes}
              onChange={(event) => setCapabilityForm((current) => ({ ...current, required_provider_scopes: event.target.value }))}
              placeholder="responses.read, responses.write"
            />
          </div>

          <Card className="border border-pink-100 bg-pink-50/70 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/80">
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('assets.capabilities.accessPolicy')}</h3>
                <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                  {t('assets.capabilities.accessPolicyDesc')}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
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
                    <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">{t('assets.capabilities.noTokens')}</p>
                  ) : (
                    allTokens.map((token) => (
                      <label
                        key={token.id}
                        className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-sm text-gray-700 dark:border-[#3D3D5C] dark:bg-[#252540]/80 dark:text-[#E8E8EC]"
                      >
                        <input
                          type="checkbox"
                          checked={capabilityForm.token_ids.includes(token.id)}
                          onChange={() => toggleCapabilityToken(token.id)}
                          className="mt-1 h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-400"
                        />
                        <span className="space-y-1">
                          <span className="block font-medium">{token.label}</span>
                          <span className="block text-xs text-gray-500 dark:text-[#9CA3AF]">
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
                    <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">还没有可选 agent，请先创建 agent。</p>
                  ) : (
                    agents.map((agent) => (
                      <label
                        key={agent.id}
                        className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-sm text-gray-700 dark:border-[#3D3D5C] dark:bg-[#252540]/80 dark:text-[#E8E8EC]"
                      >
                        <input
                          type="checkbox"
                          checked={capabilityForm.agent_ids.includes(agent.id)}
                          onChange={() => toggleCapabilityAgent(agent.id)}
                          className="mt-1 h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-400"
                        />
                        <span className="space-y-1">
                          <span className="block font-medium">{agent.name}</span>
                          <span className="block text-xs text-gray-500 dark:text-[#9CA3AF]">
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
                    <label htmlFor="token-label-key" className="block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]">标签键</label>
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
                    {capabilityForm.label_key && (tokenLabelOptions[capabilityForm.label_key] ?? []).length > 0 ? (
                      tokenLabelOptions[capabilityForm.label_key].map((value) => (
                        <label
                          key={value}
                          className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-sm text-gray-700 dark:border-[#3D3D5C] dark:bg-[#252540]/80 dark:text-[#E8E8EC]"
                        >
                          <input
                            type="checkbox"
                            checked={capabilityForm.label_values.includes(value)}
                            onChange={() => toggleCapabilityLabelValue(value)}
                            className="mt-1 h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-400"
                          />
                          <span className="space-y-1">
                            <span className="block font-medium">{value}</span>
                            <span className="block text-xs text-gray-500 dark:text-[#9CA3AF]">
                              {capabilityForm.label_key} = {value}
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
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
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
      <div className="space-y-2">
        <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{label}</p>
        <p className="text-3xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
        <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{hint}</p>
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
    <Card className="border border-dashed border-pink-200 bg-white/70 text-center dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/60">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-[#3D3D5C] dark:text-[#E891C0]">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-[#9CA3AF]">{description}</p>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50/80 px-4 py-3 dark:bg-[#252540]/80">
      <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">{label}</p>
      <p className="mt-2 text-sm text-gray-700 dark:text-[#E8E8EC] break-words">{value}</p>
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
  if (status === 'active') {
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
  agentNameById: Record<string, string>,
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
      ? 'border-pink-400 bg-pink-500 text-white'
      : 'border-pink-200 bg-white text-gray-700 hover:bg-pink-50 dark:border-[#3D3D5C] dark:bg-[#252540] dark:text-[#E8E8EC]',
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
