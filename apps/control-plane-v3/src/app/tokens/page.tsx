'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Bot, Clock3, Copy, KeyRound, Plus, RefreshCw, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import {
  AgentCreateResponse,
  ApiError,
  api,
  type AgentCreateInput,
  type AgentTokenCreateInput,
} from '@/lib/api';
import { useManagementSessionGate } from '@/lib/session';
import type { AgentSummary, AgentTokenSummary } from '@/shared/types';
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
  const { session, loading: gateLoading, error: gateError } = useManagementSessionGate();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [tokensByAgent, setTokensByAgent] = useState<Record<string, AgentTokenSummary[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false);
  const [issuingAgentId, setIssuingAgentId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const agentItems = (await api.getAgents()).items;
        const tokenEntries = await Promise.all(
          agentItems.map(async (agent) => [agent.id, (await api.getAgentTokens(agent.id)).items] as const)
        );

        if (cancelled) {
          return;
        }

        setAgents(agentItems);
        setTokensByAgent(Object.fromEntries(tokenEntries));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load agents and tokens');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshNonce, session]);

  const allTokens = useMemo(
    () => agents.flatMap((agent) => tokensByAgent[agent.id] ?? []),
    [agents, tokensByAgent]
  );
  const activeAgents = agents.filter((agent) => agent.status === 'active').length;
  const activeTokens = allTokens.filter((token) => token.status === 'active').length;
  const averageTrust =
    allTokens.length > 0 ? allTokens.reduce((total, token) => total + token.trust_score, 0) / allTokens.length : 0;
  const tokensWithFeedback = allTokens.filter((token) => token.last_feedback_at).length;

  async function handleCreateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: AgentCreateInput = {
        name: createAgentForm.name.trim(),
        risk_tier: createAgentForm.risk_tier,
        allowed_task_types: parseCommaSeparatedList(createAgentForm.allowed_task_types),
      };
      const created = await api.createAgent(payload);
      setRevealedSecret(secretFromAgentResponse(created));
      setCreateAgentForm({
        name: '',
        risk_tier: 'medium',
        allowed_task_types: 'config_sync, account_read',
      });
      setShowCreateAgentModal(false);
      setRefreshNonce((current) => current + 1);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Failed to create agent');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issuingAgentId) {
      setError('Choose an agent before minting a token');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: AgentTokenCreateInput = {
        display_name: createTokenForm.display_name.trim(),
        scopes: parseCommaSeparatedList(createTokenForm.scopes),
        labels: parseLabels(createTokenForm.labels),
        expires_at: createTokenForm.expires_at ? new Date(createTokenForm.expires_at).toISOString() : null,
      };
      const created = await api.createAgentToken(issuingAgentId, payload);
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
      setRefreshNonce((current) => current + 1);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.detail);
      } else {
        setError(submitError instanceof Error ? submitError.message : 'Failed to mint token');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeToken(tokenId: string) {
    setError(null);
    try {
      await api.revokeAgentToken(tokenId);
      setRefreshNonce((current) => current + 1);
    } catch (revokeError) {
      if (revokeError instanceof ApiError) {
        setError(revokeError.detail);
      } else {
        setError(revokeError instanceof Error ? revokeError.message : 'Failed to revoke token');
      }
    }
  }

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
    } catch {
      setError('Clipboard access was blocked. Copy the token manually from the reveal card.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-pink-700 border border-pink-100">
            <ShieldCheck className="h-4 w-4" />
            Invite-only management active
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Token operations</h1>
            <p className="mt-1 text-gray-600">
              Bootstrap now leads into human login, then into managed runtime token lifecycle for every agent.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setRefreshNonce((current) => current + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateAgentModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>
      </div>

      {revealedSecret ? (
        <Card variant="feature" className="space-y-4 border border-pink-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.3em] text-pink-500">One-time reveal</p>
              <h2 className="text-xl font-semibold text-gray-800">{revealedSecret.label}</h2>
              <p className="text-sm text-gray-600">
                This value is only returned once. Prefix: <span className="font-mono">{revealedSecret.prefix}</span>
              </p>
            </div>
            <Button variant="secondary" onClick={() => copySecret(revealedSecret.apiKey)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Token
            </Button>
          </div>
          <div className="rounded-2xl border border-pink-100 bg-white/90 p-4 font-mono text-sm text-gray-700 break-all">
            {revealedSecret.apiKey}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active agents" value={activeAgents.toString()} hint={`${agents.length} total registered`} />
        <MetricCard label="Active tokens" value={activeTokens.toString()} hint={`${allTokens.length} total runtime credentials`} />
        <MetricCard label="Average trust" value={formatDecimal(averageTrust)} hint="feedback-derived confidence" />
        <MetricCard label="Tokens with feedback" value={tokensWithFeedback.toString()} hint="review loop is active" />
      </div>

      <Card className="border border-pink-100 bg-white/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <Badge variant="primary">Current operator</Badge>
          <span>{session?.email ?? 'Loading session...'}</span>
          <span className="text-gray-300">•</span>
          <span>Role: {session?.role ?? '...'}</span>
          <span className="text-gray-300">•</span>
          <span>Public registration remains closed after owner bootstrap.</span>
        </div>
      </Card>

      {gateError || error ? (
        <Card className="border border-red-100 bg-red-50/80 text-red-700">
          {gateError ?? error}
        </Card>
      ) : null}

      {gateLoading || loading ? (
        <Card className="text-gray-600">Loading managed agents and token inventory...</Card>
      ) : null}

      {!gateLoading && !loading && agents.length === 0 ? (
        <Card variant="kawaii" className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-500">
            <Bot className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-800">No agents yet</h2>
            <p className="text-gray-600">Create the first managed agent and its primary runtime token from this console.</p>
          </div>
          <div className="flex justify-center">
            <Button onClick={() => setShowCreateAgentModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5">
        {agents.map((agent) => {
          const tokens = tokensByAgent[agent.id] ?? [];

          return (
            <Card key={agent.id} variant="kawaii" className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="agent">{agent.risk_tier} risk</Badge>
                    <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>{agent.status}</Badge>
                    <Badge variant="default">{agent.auth_method}</Badge>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800">{agent.name}</h2>
                    <p className="text-sm text-gray-500">Agent ID: {agent.id}</p>
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
                    Mint Token
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {tokens.length === 0 ? (
                  <Card className="border border-dashed border-pink-200 bg-pink-50/40 text-gray-600 xl:col-span-2">
                    No active managed tokens for this agent yet.
                  </Card>
                ) : (
                  tokens.map((token) => (
                    <Card key={token.id} className="space-y-4 border border-pink-100 bg-white/90">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={token.status === 'active' ? 'success' : 'error'}>{token.status}</Badge>
                            <Badge variant="primary">{token.display_name}</Badge>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{token.token_prefix}</h3>
                            <p className="text-sm text-gray-500">Token ID: {token.id}</p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeToken(token.id)}
                          disabled={token.status !== 'active'}
                        >
                          Revoke
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <DataPoint
                          icon={<Clock3 className="h-4 w-4 text-pink-500" />}
                          label="Last used"
                          value={formatDateTime(token.last_used_at)}
                        />
                        <DataPoint
                          icon={<Sparkles className="h-4 w-4 text-pink-500" />}
                          label="Last feedback"
                          value={formatDateTime(token.last_feedback_at)}
                        />
                        <DataPoint
                          icon={<ShieldCheck className="h-4 w-4 text-pink-500" />}
                          label="Success rate"
                          value={`${Math.round(token.success_rate * 100)}%`}
                        />
                        <DataPoint
                          icon={<Star className="h-4 w-4 text-pink-500" />}
                          label="Trust score"
                          value={formatDecimal(token.trust_score)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(token.scopes.length > 0 ? token.scopes : ['runtime']).map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {Object.entries(token.labels).map(([key, value]) => (
                          <Badge key={`${key}:${value}`} variant="default" className="text-xs">
                            {key}={value}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <MiniStat label="Completed runs" value={token.completed_runs.toString()} />
                        <MiniStat label="Successful runs" value={token.successful_runs.toString()} />
                        <MiniStat label="Issuer" value={token.issued_by_actor_id} />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={showCreateAgentModal}
        onClose={() => setShowCreateAgentModal(false)}
        title="Create managed agent"
        description="Creating an agent automatically mints its primary token."
      >
        <form className="space-y-4" onSubmit={handleCreateAgent}>
          <Input
            label="Agent name"
            value={createAgentForm.name}
            onChange={(event) => setCreateAgentForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="deploy-bot"
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Risk tier</label>
            <select
              className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
              value={createAgentForm.risk_tier}
              onChange={(event) => setCreateAgentForm((current) => ({ ...current, risk_tier: event.target.value }))}
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
              setCreateAgentForm((current) => ({ ...current, allowed_task_types: event.target.value }))
            }
            placeholder="config_sync, account_read"
            helper="Comma-separated. Leave blank to keep the allowlist open until policy UI expands."
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateAgentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Agent
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showCreateTokenModal}
        onClose={() => setShowCreateTokenModal(false)}
        title="Mint managed token"
        description="Issue another runtime credential for an existing agent."
      >
        <form className="space-y-4" onSubmit={handleCreateToken}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Agent</label>
            <select
              className="w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
              value={issuingAgentId ?? ''}
              onChange={(event) => setIssuingAgentId(event.target.value)}
              required
            >
              <option value="" disabled>
                Select an agent
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
            onChange={(event) => setCreateTokenForm((current) => ({ ...current, display_name: event.target.value }))}
            placeholder="Staging worker token"
            required
          />
          <Input
            label="Scopes"
            value={createTokenForm.scopes}
            onChange={(event) => setCreateTokenForm((current) => ({ ...current, scopes: event.target.value }))}
            placeholder="runtime"
            helper="Comma-separated scope labels."
          />
          <Input
            label="Labels"
            value={createTokenForm.labels}
            onChange={(event) => setCreateTokenForm((current) => ({ ...current, labels: event.target.value }))}
            placeholder="environment=staging, pool=blue"
            helper="Comma-separated key=value labels."
          />
          <Input
            label="Expires at"
            type="datetime-local"
            value={createTokenForm.expires_at}
            onChange={(event) => setCreateTokenForm((current) => ({ ...current, expires_at: event.target.value }))}
          />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreateTokenModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Mint Token
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2 border border-pink-100 bg-white/90">
      <p className="text-sm uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{hint}</p>
    </Card>
  );
}

function DataPoint({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-800 break-all">{value}</p>
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

function secretFromAgentResponse(response: AgentCreateResponse) {
  return {
    label: `${response.name} primary token`,
    prefix: response.token_prefix,
    apiKey: response.api_key,
  };
}
