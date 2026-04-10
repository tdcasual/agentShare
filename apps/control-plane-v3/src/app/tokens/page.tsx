'use client';

import { FormEvent, useMemo, useState, memo } from 'react';
import { useI18n } from '@/components/i18n-provider';
import {
  Bot,
  Clock3,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import {
  useAgentsWithTokens,
  useCreateAgent,
  useCreateAgentToken,
  useRevokeAgentToken,
} from '@/domains/identity';
import { ApiError, type AgentCreateInput, type AgentTokenCreateInput } from '@/lib/api-client';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { Input } from '@/shared/ui-primitives/input';
import { Modal } from '@/shared/ui-primitives/modal';

export default function TokensPage() {
  return (
    <Layout>
      <TokensContent />
    </Layout>
  );
}

const TokensContent = memo(function TokensContent() {
  const t = useI18n().t;
  // 使用新的 SWR hooks 替代手动 useEffect
  const {
    agents,
    tokensByAgent,
    isLoading,
    error: dataError,
    mutate,
  } = useAgentsWithTokens({
    refreshInterval: 10000, // 10秒自动刷新
  });
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(dataError);

  const createAgent = useCreateAgent();
  const createAgentToken = useCreateAgentToken();
  const revokeAgentToken = useRevokeAgentToken();

  // 本地 UI 状态
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [issuingAgentId, setIssuingAgentId] = useState<string | null>(null);
  const [selectedHealthFilter, setSelectedHealthFilter] = useState<
    'all' | 'needs_feedback' | 'low_trust'
  >('all');
  const [createAgentForm, setCreateAgentForm] = useState({
    name: '',
    risk_tier: 'medium',
    allowed_task_types: 'config_sync, account_read',
  });
  const [createTokenForm, setCreateTokenForm] = useState({
    display_name: '',
    scopes: 'runtime',
    labels: '',
    expires_at: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<{
    label: string;
    prefix: string;
    apiKey: string;
  } | null>(null);

  const allTokens = useMemo(
    () => agents.flatMap((agent) => tokensByAgent[agent.id] ?? []),
    [agents, tokensByAgent]
  );
  const activeAgents = agents.filter((agent) => agent.status === 'active').length;
  const activeTokens = allTokens.filter((token) => token.status === 'active').length;
  const averageTrust =
    allTokens.length > 0
      ? allTokens.reduce((total, token) => total + (token.trustScore ?? 0), 0) / allTokens.length
      : 0;
  const tokensWithFeedback = allTokens.filter((token) => token.lastFeedbackAt).length;
  const tokensNeedingFeedback = allTokens.filter((token) => !token.lastFeedbackAt).length;
  const lowTrustTokens = allTokens.filter((token) => (token.trustScore ?? 0) < 0.6).length;

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError(null);
    clearAllAuthErrors();

    try {
      await mutate();
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }

      setRefreshError(
        refreshFailure instanceof Error
          ? refreshFailure.message
          : t('tokens.errors.refreshFailed')
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCreateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    clearAllAuthErrors();

    try {
      const payload: AgentCreateInput = {
        name: createAgentForm.name.trim(),
        risk_tier: createAgentForm.risk_tier,
        allowed_task_types: parseCommaSeparatedList(createAgentForm.allowed_task_types),
      };
      const created = await createAgent(payload);
      setRevealedSecret(secretFromAgentResponse(created));
      setCreateAgentForm({
        name: '',
        risk_tier: 'medium',
        allowed_task_types: 'config_sync, account_read',
      });
      setShowCreateAgentModal(false);
    } catch (submitError) {
      if (consumeUnauthorized(submitError)) {
        return;
      }

      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(
          submitError instanceof Error ? submitError.message : t('tokens.errors.registerAgentFailed')
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issuingAgentId) {
      setError(t('tokens.errors.noAgentSelected'));
      return;
    }

    setSubmitting(true);
    setError(null);
    clearAllAuthErrors();

    try {
      const payload: AgentTokenCreateInput = {
        display_name: createTokenForm.display_name.trim(),
        scopes: parseCommaSeparatedList(createTokenForm.scopes),
        labels: parseLabels(createTokenForm.labels),
        expires_at: createTokenForm.expires_at
          ? new Date(createTokenForm.expires_at).toISOString()
          : null,
      };
      const created = await createAgentToken(issuingAgentId, payload);
      setRevealedSecret({
        label: created.display_name,
        prefix: created.token_prefix,
        apiKey: created.api_key ?? '',
      });
      setCreateTokenForm({
        display_name: '',
        scopes: 'runtime',
        labels: '',
        expires_at: '',
      });
      setShowCreateTokenModal(false);
    } catch (submitError) {
      if (consumeUnauthorized(submitError)) {
        return;
      }

      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(
          submitError instanceof Error ? submitError.message : t('tokens.errors.mintTokenFailed')
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeToken(tokenId: string, agentId: string) {
    setError(null);
    clearAllAuthErrors();

    try {
      await revokeAgentToken(tokenId, agentId);
    } catch (revokeError) {
      if (consumeUnauthorized(revokeError)) {
        return;
      }

      if (revokeError instanceof ApiError) {
        setError(revokeError.detail);
      } else {
        setError(
          revokeError instanceof Error ? revokeError.message : t('tokens.errors.revokeTokenFailed')
        );
      }
    }
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
    } catch {
      setError(t('tokens.errors.clipboardBlocked'));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 px-4 py-2 text-sm text-[var(--kw-primary-600)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80 dark:text-[var(--kw-dark-primary)]">
            <ShieldCheck className="h-4 w-4" />
            {t('tokens.subtitle')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('tokens.title')}
            </h1>
            <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">{t('tokens.description')}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('tokens.actions.refresh')}
          </Button>
          <Button onClick={() => setShowCreateAgentModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('tokens.actions.createAgent')}
          </Button>
        </div>
      </div>

      {/* Revealed Secret */}
      {revealedSecret ? (
        <Card
          variant="feature"
          className="space-y-4 border border-[var(--kw-border)] dark:border-[var(--kw-dark-border)] dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.3em] text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]">
                🌸 {t('tokens.token.oneTimeReveal')}
              </p>
              <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {revealedSecret.label}
              </h2>
              <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                Prefix: <span className="font-mono">{revealedSecret.prefix}</span>
              </p>
            </div>
            <Button variant="secondary" onClick={() => copySecret(revealedSecret.apiKey)}>
              <Copy className="mr-2 h-4 w-4" />
              {t('tokens.token.copyToken')}
            </Button>
          </div>
          <div className="break-all rounded-2xl border border-[var(--kw-border)] bg-white/90 p-4 font-mono text-sm text-[var(--kw-text)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]">
            {revealedSecret.apiKey}
          </div>
        </Card>
      ) : null}

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('tokens.metrics.activeAgents')}
          value={activeAgents.toString()}
          hint={`${agents.length} total`}
        />
        <MetricCard
          label={t('tokens.metrics.activeTokens')}
          value={activeTokens.toString()}
          hint={`${allTokens.length} total`}
        />
        <MetricCard
          label={t('tokens.metrics.averageTrust')}
          value={formatDecimal(averageTrust)}
          hint="feedback"
        />
        <MetricCard
          label={t('tokens.metrics.tokensWithFeedback')}
          value={tokensWithFeedback.toString()}
          hint="reviewed"
        />
      </div>

      <Card className="border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/90">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              Remote access supervision
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              Human operators can quickly isolate access tokens used by external machines and
              off-project agents when they still need feedback or fall below the trust threshold.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            <Badge variant="secondary">
              {tokensNeedingFeedback} token{tokensNeedingFeedback === 1 ? '' : 's'} need
              {tokensNeedingFeedback === 1 ? 's' : ''} feedback
            </Badge>
            <Badge variant="warning">
              {lowTrustTokens} low-trust token{lowTrustTokens === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedHealthFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={selectedHealthFilter === 'all'}
              onClick={() => setSelectedHealthFilter('all')}
            >
              All tokens
            </Button>
            <Button
              variant={selectedHealthFilter === 'needs_feedback' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={selectedHealthFilter === 'needs_feedback'}
              onClick={() => setSelectedHealthFilter('needs_feedback')}
            >
              Needs feedback
            </Button>
            <Button
              variant={selectedHealthFilter === 'low_trust' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={selectedHealthFilter === 'low_trust'}
              onClick={() => setSelectedHealthFilter('low_trust')}
            >
              Low trust
            </Button>
          </div>
        </div>
      </Card>

      {/* Session Info */}
      <Card className="border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <Badge variant="primary">Operator</Badge>
          <span className="dark:text-[var(--kw-dark-text)]">{session?.email ?? t('common.loading')}</span>
          <span className="text-[var(--kw-border)] dark:text-[var(--kw-dark-border)]">•</span>
          <span>{session?.role ?? '...'}</span>
        </div>
      </Card>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={t("tokens.sessionExpired")} />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t("tokens.sessionForbidden")} />
      ) : null}

      {refreshError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 dark:text-[var(--kw-error)]"
        >
          {refreshError}
        </Card>
      ) : null}

      {/* Error */}
      {gateError || error || (!shouldShowSessionExpired && !shouldShowForbidden && dataError) ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="border border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/80 text-[var(--kw-rose-text)] dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 dark:text-[var(--kw-error)]"
        >
          {gateError ??
            error ??
            (dataError instanceof Error ? dataError.message : t('tokens.errors.loadDataFailed'))}
        </Card>
      ) : null}

      {/* Loading */}
      {gateLoading || isLoading ? (
        <Card className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <span className="animate-spin">🌸</span>
          Loading remote agents and access tokens...
        </Card>
      ) : null}

      {/* Empty State */}
      {!gateLoading && !isLoading && agents.length === 0 ? (
        <Card
          variant="kawaii"
          className="space-y-4 text-center dark:border-[var(--kw-dark-border)] dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-500)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
            <Bot className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('tokens.agent.noAgents')}
            </h2>
            <p className="mx-auto max-w-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('tokens.agent.createFirst')}
            </p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setShowCreateAgentModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('tokens.actions.createAgent')}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Agents List */}
      <div className="grid gap-5">
        {agents.map((agent) => {
          const tokens = (tokensByAgent[agent.id] ?? []).filter((token) => {
            if (selectedHealthFilter === 'needs_feedback') {
              return !token.lastFeedbackAt;
            }
            if (selectedHealthFilter === 'low_trust') {
              return (token.trustScore ?? 0) < 0.6;
            }
            return true;
          });

          if (selectedHealthFilter !== 'all' && tokens.length === 0) {
            return null;
          }

          return (
            <Card
              key={agent.id}
              variant="kawaii"
              className="space-y-5 dark:border-[var(--kw-dark-border)] dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
            >
              {/* Agent Header */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="agent">{agent.risk_tier} risk</Badge>
                    <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                      {agent.status}
                    </Badge>
                    <Badge variant="default">{agent.auth_method}</Badge>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                      {agent.name}
                    </h2>
                    <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">ID: {agent.id}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIssuingAgentId(agent.id);
                      setShowCreateTokenModal(true);
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    {t('tokens.actions.mintToken')}
                  </Button>
                </div>
              </div>

              {/* Tokens Grid */}
              <div className="grid gap-4 xl:grid-cols-2">
                {tokens.length === 0 ? (
                  <Card className="border border-dashed border-[var(--kw-primary-200)] bg-[var(--kw-primary-50)]/40 py-8 text-center text-[var(--kw-text-muted)] xl:col-span-2 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]/40 dark:text-[var(--kw-dark-text-muted)]">
                    <span className="mr-2 text-2xl">🌸</span>
                    {t('tokens.agent.noTokens')}
                  </Card>
                ) : (
                  tokens.map((token) => (
                    <Card
                      key={token.id}
                      className="space-y-4 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]/90"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={token.status === 'active' ? 'success' : 'error'}>
                              {token.status}
                            </Badge>
                            <Badge variant="primary">{token.displayName}</Badge>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                              {token.tokenPrefix}
                            </h3>
                            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                              ID: {token.id}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeToken(token.id, agent.id)}
                          disabled={token.status !== 'active'}
                        >
                          {t('tokens.actions.revoke')}
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <DataPoint
                          icon={<Clock3 className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />}
                          label={t('tokens.token.lastUsed')}
                          value={formatDateTime(token.lastUsedAt ?? null, t('tokens.values.notYet'))}
                        />
                        <DataPoint
                          icon={<Sparkles className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />}
                          label={t('tokens.token.lastFeedback')}
                          value={formatDateTime(token.lastFeedbackAt ?? null, t('tokens.values.notYet'))}
                        />
                        <DataPoint
                          icon={
                            <ShieldCheck className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
                          }
                          label={t('tokens.token.successRate')}
                          value={`${Math.round((token.successRate ?? 0) * 100)}%`}
                        />
                        <DataPoint
                          icon={<Star className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />}
                          label={t('tokens.token.trustScore')}
                          value={formatDecimal(token.trustScore ?? 0)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {((token.scopes?.length ?? 0) > 0 ? token.scopes : ['runtime'])!.map(
                          (scope: string) => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                            </Badge>
                          )
                        )}
                        {Object.entries(token.labels ?? {}).map(([key, value]) => (
                          <Badge key={`${key}:${value}`} variant="default" className="text-xs">
                            {key}={value as string}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <MiniStat
                          label={t('tokens.token.completedRuns')}
                          value={(token.completedRuns ?? 0).toString()}
                        />
                        <MiniStat
                          label={t('tokens.token.successfulRuns')}
                          value={(token.successfulRuns ?? 0).toString()}
                        />
                        <MiniStat
                          label={t('tokens.token.issuer')}
                          value={token.issuedByActorId ?? '-'}
                        />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Agent Modal */}
      <Modal
        isOpen={showCreateAgentModal}
        onClose={() => setShowCreateAgentModal(false)}
        title={t('tokens.actions.createAgent')}
        description="Register a remote agent profile and mint its first access token."
      >
        <form className="space-y-4" onSubmit={handleCreateAgent}>
          <Input
            label={t("tokens.form.agentName")}
            value={createAgentForm.name}
            onChange={(event) =>
              setCreateAgentForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={t("tokens.form.agentNamePlaceholder")}
            required
            className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
          />
          <div>
            <label
              htmlFor="agent-risk-tier"
              className="mb-1.5 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
            >
              Risk tier
            </label>
            <select
              id="agent-risk-tier"
              className="w-full rounded-2xl border-2 border-[var(--kw-primary-200)] bg-white px-4 py-3 text-base text-[var(--kw-text)] outline-none focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)] dark:focus:border-[var(--kw-dark-primary)] dark:focus:ring-[var(--kw-dark-primary)]/10"
              value={createAgentForm.risk_tier}
              onChange={(event) =>
                setCreateAgentForm((current) => ({ ...current, risk_tier: event.target.value }))
              }
            >
              <option value="low">{t('tokens.riskTiers.low')}</option>
              <option value="medium">{t('tokens.riskTiers.medium')}</option>
              <option value="high">{t('tokens.riskTiers.high')}</option>
              <option value="critical">{t('tokens.riskTiers.critical')}</option>
            </select>
          </div>
          <Input
            label={t("tokens.form.allowedTaskTypes")}
            value={createAgentForm.allowed_task_types}
            onChange={(event) =>
              setCreateAgentForm((current) => ({
                ...current,
                allowed_task_types: event.target.value,
              }))
            }
            placeholder={t("tokens.form.allowedTaskTypesPlaceholder")}
            helper="Comma-separated. Leave blank to keep the allowlist open until policy UI expands."
            className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateAgentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {submitting ? (
                <span className="mr-2 animate-spin">🌸</span>
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t('tokens.actions.createAgent')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Token Modal */}
      <Modal
        isOpen={showCreateTokenModal}
        onClose={() => setShowCreateTokenModal(false)}
        title={t('tokens.actions.mintToken')}
        description="Issue another access token for an existing remote agent profile."
      >
        <form className="space-y-4" onSubmit={handleCreateToken}>
          <div>
            <label
              htmlFor="token-agent-select"
              className="mb-1.5 block text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]"
            >
              Remote agent
            </label>
            <select
              id="token-agent-select"
              className="w-full rounded-2xl border-2 border-[var(--kw-primary-200)] bg-white px-4 py-3 text-base text-[var(--kw-text)] outline-none focus:border-[var(--kw-primary-400)] focus:ring-4 focus:ring-[var(--kw-primary-100)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)] dark:focus:border-[var(--kw-dark-primary)] dark:focus:ring-[var(--kw-dark-primary)]/10"
              value={issuingAgentId ?? ''}
              onChange={(event) => setIssuingAgentId(event.target.value)}
              required
            >
              <option value="" disabled>
                Select a remote agent
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t("tokens.form.displayName")}
            value={createTokenForm.display_name}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, display_name: event.target.value }))
            }
            placeholder={t("tokens.form.displayNamePlaceholder")}
            required
            className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
          />
          <Input
            label={t("tokens.form.scopes")}
            value={createTokenForm.scopes}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, scopes: event.target.value }))
            }
            placeholder={t("tokens.form.scopesPlaceholder")}
            helper="Comma-separated scope labels."
            className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
          />
          <Input
            label={t("tokens.form.labels")}
            value={createTokenForm.labels}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, labels: event.target.value }))
            }
            placeholder={t("tokens.form.labelsPlaceholder")}
            helper="Comma-separated key=value labels."
            className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
          />
          <Input
            label={t("tokens.form.expiresAt")}
            type="datetime-local"
            value={createTokenForm.expires_at}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, expires_at: event.target.value }))
            }
            className="dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text)]"
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateTokenModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {submitting ? (
                <span className="mr-2 animate-spin">🌸</span>
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              {t('tokens.actions.mintToken')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
});

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/90">
      <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {label}
      </p>
      <p className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">{value}</p>
      <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">{hint}</p>
    </Card>
  );
}

function DataPoint({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--kw-border)] bg-[var(--kw-primary-50)]/40 p-3 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]/60">
      <div className="flex items-center gap-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--kw-surface-alt)] px-4 py-3 dark:bg-[var(--kw-dark-bg)]">
      <p className="text-xs uppercase tracking-[0.15em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
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

function parseLabels(value: string) {
  if (!value.trim()) {
    return {};
  }

  return Object.fromEntries(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [key, ...rest] = entry.split('=');
        return [key.trim(), rest.join('=').trim()];
      })
      .filter(([key, labelValue]) => key && labelValue)
  );
}

function formatDateTime(value: string | null, notYetLabel: string) {
  if (!value) {
    return notYetLabel;
  }
  return new Date(value).toLocaleString();
}

function formatDecimal(value: number) {
  return value.toFixed(2);
}

function secretFromAgentResponse(response: {
  name: string;
  token_prefix: string;
  api_key: string;
}) {
  return {
    label: `${response.name} primary token`,
    prefix: response.token_prefix,
    apiKey: response.api_key,
  };
}
