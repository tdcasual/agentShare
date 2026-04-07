'use client';

import { FormEvent, useMemo, useState } from 'react';
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

function TokensContent() {
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
      ? allTokens.reduce((total, token) => total + (token.trust_score ?? token.trustScore), 0) /
        allTokens.length
      : 0;
  const tokensWithFeedback = allTokens.filter((token) => token.last_feedback_at).length;
  const tokensNeedingFeedback = allTokens.filter((token) => !token.last_feedback_at).length;
  const lowTrustTokens = allTokens.filter(
    (token) => (token.trust_score ?? token.trustScore) < 0.6
  ).length;

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
          : 'Failed to refresh remote access tokens'
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
          submitError instanceof Error ? submitError.message : 'Failed to register remote agent'
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issuingAgentId) {
      setError('Choose a remote agent profile before minting a token');
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
          submitError instanceof Error ? submitError.message : 'Failed to mint access token'
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
          revokeError instanceof Error ? revokeError.message : 'Failed to revoke access token'
        );
      }
    }
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
    } catch {
      setError(
        'Clipboard access was blocked. Copy the access token manually from the reveal card.'
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/80 px-4 py-2 text-sm text-pink-700 dark:border-[#3D3D5C] dark:bg-[#252540]/80 dark:text-[#E891C0]">
            <ShieldCheck className="h-4 w-4" />
            {t('tokens.subtitle')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
              {t('tokens.title')}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-[#9CA3AF]">{t('tokens.description')}</p>
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
          className="space-y-4 border border-pink-100 dark:border-[#3D3D5C] dark:from-[#252540] dark:to-[#2D2D50]"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.3em] text-pink-500 dark:text-[#E891C0]">
                🌸 {t('tokens.token.oneTimeReveal')}
              </p>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
                {revealedSecret.label}
              </h2>
              <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                Prefix: <span className="font-mono">{revealedSecret.prefix}</span>
              </p>
            </div>
            <Button variant="secondary" onClick={() => copySecret(revealedSecret.apiKey)}>
              <Copy className="mr-2 h-4 w-4" />
              {t('tokens.token.copyToken')}
            </Button>
          </div>
          <div className="break-all rounded-2xl border border-pink-100 bg-white/90 p-4 font-mono text-sm text-gray-700 dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]">
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

      <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">
              Remote access supervision
            </h2>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
              Human operators can quickly isolate access tokens used by external machines and
              off-project agents when they still need feedback or fall below the trust threshold.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
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
      <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
          <Badge variant="primary">Operator</Badge>
          <span className="dark:text-[#E8E8EC]">{session?.email ?? 'Loading...'}</span>
          <span className="text-gray-300 dark:text-[#3D3D5C]">•</span>
          <span>{session?.role ?? '...'}</span>
        </div>
      </Card>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep working with live remote access data." />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message="You do not have permission to manage remote agents and access tokens. Use an admin management session to continue." />
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

      {/* Error */}
      {gateError || error || (!shouldShowSessionExpired && !shouldShowForbidden && dataError) ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
        >
          {gateError ??
            error ??
            (dataError instanceof Error ? dataError.message : 'Failed to load data')}
        </Card>
      ) : null}

      {/* Loading */}
      {gateLoading || isLoading ? (
        <Card className="flex items-center gap-3 text-gray-600 dark:text-[#9CA3AF]">
          <span className="animate-spin">🌸</span>
          Loading remote agents and access tokens...
        </Card>
      ) : null}

      {/* Empty State */}
      {!gateLoading && !isLoading && agents.length === 0 ? (
        <Card
          variant="kawaii"
          className="space-y-4 text-center dark:border-[#3D3D5C] dark:from-[#252540] dark:to-[#2D2D50]"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-[#3D3D5C] dark:text-[#E891C0]">
            <Bot className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {t('tokens.agent.noAgents')}
            </h2>
            <p className="mx-auto max-w-sm text-gray-600 dark:text-[#9CA3AF]">
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
              return !token.last_feedback_at;
            }
            if (selectedHealthFilter === 'low_trust') {
              return (token.trust_score ?? token.trustScore) < 0.6;
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
              className="space-y-5 dark:border-[#3D3D5C] dark:from-[#252540] dark:to-[#2D2D50]"
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
                    <h2 className="text-2xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
                      {agent.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">ID: {agent.id}</p>
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
                  <Card className="border border-dashed border-pink-200 bg-pink-50/40 py-8 text-center text-gray-600 xl:col-span-2 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/40 dark:text-[#9CA3AF]">
                    <span className="mr-2 text-2xl">🌸</span>
                    {t('tokens.agent.noTokens')}
                  </Card>
                ) : (
                  tokens.map((token) => (
                    <Card
                      key={token.id}
                      className="space-y-4 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/90"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={token.status === 'active' ? 'success' : 'error'}>
                              {token.status}
                            </Badge>
                            <Badge variant="primary">{token.display_name}</Badge>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">
                              {token.token_prefix}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
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
                          icon={<Clock3 className="h-4 w-4 text-pink-500 dark:text-[#E891C0]" />}
                          label={t('tokens.token.lastUsed')}
                          value={formatDateTime(token.last_used_at ?? null)}
                        />
                        <DataPoint
                          icon={<Sparkles className="h-4 w-4 text-pink-500 dark:text-[#E891C0]" />}
                          label={t('tokens.token.lastFeedback')}
                          value={formatDateTime(token.last_feedback_at ?? null)}
                        />
                        <DataPoint
                          icon={
                            <ShieldCheck className="h-4 w-4 text-pink-500 dark:text-[#E891C0]" />
                          }
                          label={t('tokens.token.successRate')}
                          value={`${Math.round((token.success_rate ?? 0) * 100)}%`}
                        />
                        <DataPoint
                          icon={<Star className="h-4 w-4 text-pink-500 dark:text-[#E891C0]" />}
                          label={t('tokens.token.trustScore')}
                          value={formatDecimal(token.trust_score ?? token.trustScore)}
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
                          value={(token.completed_runs ?? 0).toString()}
                        />
                        <MiniStat
                          label={t('tokens.token.successfulRuns')}
                          value={(token.successful_runs ?? 0).toString()}
                        />
                        <MiniStat
                          label={t('tokens.token.issuer')}
                          value={token.issued_by_actor_id ?? '-'}
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
            label="Remote agent name"
            value={createAgentForm.name}
            onChange={(event) =>
              setCreateAgentForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="deploy-bot"
            required
            className="dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]"
          />
          <div>
            <label
              htmlFor="agent-risk-tier"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]"
            >
              Risk tier
            </label>
            <select
              id="agent-risk-tier"
              className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base text-gray-800 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC] dark:focus:border-[#E891C0] dark:focus:ring-pink-500/10"
              value={createAgentForm.risk_tier}
              onChange={(event) =>
                setCreateAgentForm((current) => ({ ...current, risk_tier: event.target.value }))
              }
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
          </div>
          <Input
            label="Allowed task types"
            value={createAgentForm.allowed_task_types}
            onChange={(event) =>
              setCreateAgentForm((current) => ({
                ...current,
                allowed_task_types: event.target.value,
              }))
            }
            placeholder="config_sync, account_read"
            helper="Comma-separated. Leave blank to keep the allowlist open until policy UI expands."
            className="dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]"
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
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-[#E8E8EC]"
            >
              Remote agent
            </label>
            <select
              id="token-agent-select"
              className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base text-gray-800 outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100 dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC] dark:focus:border-[#E891C0] dark:focus:ring-pink-500/10"
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
            label="Display name"
            value={createTokenForm.display_name}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, display_name: event.target.value }))
            }
            placeholder="Staging worker token"
            required
            className="dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]"
          />
          <Input
            label="Scopes"
            value={createTokenForm.scopes}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, scopes: event.target.value }))
            }
            placeholder="runtime"
            helper="Comma-separated scope labels."
            className="dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]"
          />
          <Input
            label="Labels"
            value={createTokenForm.labels}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, labels: event.target.value }))
            }
            placeholder="environment=staging, pool=blue"
            helper="Comma-separated key=value labels."
            className="dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]"
          />
          <Input
            label="Expires at"
            type="datetime-local"
            value={createTokenForm.expires_at}
            onChange={(event) =>
              setCreateTokenForm((current) => ({ ...current, expires_at: event.target.value }))
            }
            className="dark:border-[#3D3D5C] dark:bg-[#1A1A2E] dark:text-[#E8E8EC]"
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
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-[#9CA3AF]">
        {label}
      </p>
      <p className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{hint}</p>
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
    <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]/60">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9CA3AF]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-800 dark:text-[#E8E8EC]">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-[#1A1A2E]">
      <p className="text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-semibold text-gray-800 dark:text-[#E8E8EC]">
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

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not yet';
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
