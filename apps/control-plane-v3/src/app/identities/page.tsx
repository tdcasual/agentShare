'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Bot, Building2, ChevronDown, ChevronUp, RefreshCw, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  refreshAdminAccounts,
  refreshAgents,
  refreshSession,
  useAgentTokens,
  useAdminAccounts,
  useAgentsWithTokens,
  useDeleteAgent,
} from '@/domains/identity';
import { useEvents } from '@/domains/event';
import { Layout } from '@/interfaces/human/layout';
import {
  isUnauthorizedError,
  ManagementSessionExpiredAlert,
  ManagementSessionRecoveryNotice,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { readFocusedEntry } from '@/lib/focused-entry';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';

export default function IdentitiesPage() {
  return (
    <Layout>
      <IdentitiesContent />
    </Layout>
  );
}

function IdentitiesContent() {
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const { data: adminAccountsData, isLoading: isAccountsLoading, error: accountsError } = useAdminAccounts();
  const agentsQuery = useAgentsWithTokens();
  const eventsQuery = useEvents();
  const deleteAgent = useDeleteAgent();
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowSessionExpired,
    clearSessionExpired,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([accountsError, agentsQuery.error, eventsQuery.error]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshingAction, setRefreshingAction] = useState<'all' | 'accounts' | 'agents' | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>(() => (focus.adminId ? [focus.adminId] : []));
  const [expandedAgents, setExpandedAgents] = useState<string[]>(() => (focus.agentId ? [focus.agentId] : []));
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const adminAccounts = adminAccountsData?.items;
  const agents = agentsQuery.agents;
  const tokensByAgent = agentsQuery.tokensByAgent;
  const adminAccountList = adminAccounts ?? [];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredAdminAccounts = useMemo(
    () => (adminAccounts ?? []).filter((account) => matchesAdminAccountQuery(account, normalizedQuery)),
    [adminAccounts, normalizedQuery]
  );
  const filteredAgents = useMemo(
    () => agents.filter((agent) => matchesAgentQuery(agent, normalizedQuery)),
    [agents, normalizedQuery]
  );
  const focusedAdminAccount = adminAccountList.find((account) => account.id === focus.adminId) ?? null;
  const focusedAgent = agents.find((agent) => agent.id === focus.agentId) ?? null;
  const focusedIdentity = focusedAgent ?? focusedAdminAccount;
  const focusedIdentityLabel = focusedAgent ? 'Agent' : focusedAdminAccount ? 'Human operator' : null;

  const operatorCount = adminAccountList.filter((account) => account.status === 'active').length;
  const ownerCount = adminAccountList.filter((account) => account.role === 'owner').length;
  const activeAgentCount = agents.filter((agent) => agent.status === 'active').length;
  const agentFeedbackCounts = useMemo(
    () =>
      eventsQuery.events
        .filter((event) => event.actor_type === 'agent')
        .reduce<Record<string, number>>((counts, event) => {
          counts[event.actor_id] = (counts[event.actor_id] ?? 0) + 1;
          return counts;
        }, {}),
    [eventsQuery.events]
  );
  const agentsWithLinkedTokensCount = agents.filter((agent) => (tokensByAgent[agent.id] ?? []).length > 0).length;
  const agentsWithFeedbackCount = agents.filter((agent) => (agentFeedbackCounts[agent.id] ?? 0) > 0).length;
  const guardedError = gateError;
  const accountsErrorMessage = accountsError instanceof Error ? accountsError.message : null;
  const agentsErrorMessage = agentsQuery.error instanceof Error ? agentsQuery.error.message : null;
  const eventsErrorMessage = eventsQuery.error instanceof Error ? eventsQuery.error.message : null;

  const isLoading = gateLoading;
  const hasActiveSearch = normalizedQuery.length > 0;
  async function runRefreshAction(
    action: 'all' | 'accounts' | 'agents',
    operation: () => Promise<unknown>
  ) {
    setRefreshingAction(action);
    setActionError(null);
    clearSessionExpired();

    try {
      await operation();
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }

      setActionError(error instanceof Error ? error.message : 'Failed to refresh identity data');
    } finally {
      setRefreshingAction(null);
    }
  }

  async function refreshSnapshot() {
    await runRefreshAction('all', async () => {
      await Promise.all([
        refreshSession(),
        refreshAdminAccounts(),
        refreshAgents(),
      ]);
    });
  }

  async function retryAccounts() {
    await runRefreshAction('accounts', refreshAdminAccounts);
  }

  async function retryAgents() {
    await runRefreshAction('agents', refreshAgents);
  }

  async function handleDeleteAgent(agentId: string) {
    setDeletingAgentId(agentId);
    setActionError(null);
    clearSessionExpired();

    try {
      await deleteAgent(agentId);
      setExpandedAgents((current) => current.filter((id) => id !== agentId));
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }

      setActionError(error instanceof Error ? error.message : 'Failed to delete agent');
    } finally {
      setDeletingAgentId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC] mb-2">
            Identity Management
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF]">
            Review the persisted human operators and registered agents available to the management control plane.
          </p>
        </div>
        <Card className="border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
            <Badge variant="primary">Operator</Badge>
            <span className="dark:text-[#E8E8EC]">{session?.email ?? 'Loading...'}</span>
            <span className="text-gray-300 dark:text-[#3D3D5C]">•</span>
            <span>{session?.role ?? '...'}</span>
          </div>
        </Card>
      </div>

      <Card className="border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex-1">
            <span className="sr-only">Search identities</span>
            <div className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-gray-600 dark:border-[#3D3D5C] dark:bg-[#1E1E32] dark:text-[#9CA3AF]">
              <Search className="h-4 w-4 flex-shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search identities by name, email, role, or id"
                aria-label="Search identities"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-[#6B7280]"
              />
            </div>
          </label>

          <Button
            variant="secondary"
            size="sm"
            loading={refreshingAction === 'all'}
            onClick={refreshSnapshot}
            leftIcon={refreshingAction !== 'all' ? <RefreshCw className="h-4 w-4" /> : undefined}
          >
            Refresh Snapshot
          </Button>
        </div>
      </Card>

      {focusedIdentity ? (
        <Card className="border border-pink-200 bg-pink-50/70 dark:border-pink-500/60 dark:bg-pink-500/10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
              Focused identity
            </p>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {'name' in focusedIdentity ? focusedIdentity.name : focusedIdentity.display_name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              {focusedIdentityLabel} · {focusedIdentity.id}
            </p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-sky-100 dark:border-[#3D3D5C] bg-sky-50/70 dark:bg-[#1E1E32]/80">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-[#2D4A5D] dark:text-sky-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-[#E8E8EC]">Human supervisors</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                Human operators supervise policy, approvals, and account hygiene across the control plane.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border border-green-100 dark:border-[#3D3D5C] bg-green-50/70 dark:bg-[#1E1E32]/80">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-100 text-green-700 dark:bg-[#2D4A3D] dark:text-green-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-[#E8E8EC]">Agent-managed identities</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                Agents maintain their own execution identity, while humans can still inspect and manage their status.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-amber-200 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                Management coverage
              </h2>
              <p className="text-amber-700 dark:text-amber-300">
                This route now reads persisted management accounts and registered agents from the backend.
                Humans supervise governance and account hygiene while agents surface their runtime identity through linked tokens and feedback events.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CoverageMetric
              label="Human coverage"
              value={`${ownerCount} owner${ownerCount === 1 ? '' : 's'}`}
              hint={`${operatorCount} active operator${operatorCount === 1 ? '' : 's'} on duty`}
            />
            <CoverageMetric
              label="Agents with linked tokens"
              value={agentsWithLinkedTokensCount.toString()}
              hint={`${Math.max(agents.length - agentsWithLinkedTokensCount, 0)} awaiting token coverage`}
            />
            <CoverageMetric
              label="Agents with feedback"
              value={agentsWithFeedbackCount.toString()}
              hint={`${Math.max(agents.length - agentsWithFeedbackCount, 0)} without recent feedback`}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Operators"
          value={accountsErrorMessage ? 'N/A' : operatorCount.toString()}
          hint={accountsErrorMessage ? 'accounts unavailable' : `${adminAccountList.length} total accounts`}
        />
        <MetricCard
          label="Owners"
          value={accountsErrorMessage ? 'N/A' : ownerCount.toString()}
          hint={accountsErrorMessage ? 'accounts unavailable' : 'governance and account custody'}
        />
        <MetricCard
          label="Active Agents"
          value={agentsErrorMessage ? 'N/A' : activeAgentCount.toString()}
          hint={agentsErrorMessage ? 'agents unavailable' : `${agents.length} registered`}
        />
      </div>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep working with live identity data." />
      ) : null}

      {actionError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="border border-red-100 dark:border-red-900/50 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-400"
        >
          {actionError}
        </Card>
      ) : null}

      {guardedError ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="border border-red-100 dark:border-red-900/50 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-400"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span>{guardedError}</span>
            <Button
              variant="secondary"
              size="sm"
              loading={refreshingAction === 'all'}
              onClick={refreshSnapshot}
              leftIcon={refreshingAction !== 'all' ? <RefreshCw className="h-4 w-4" /> : undefined}
            >
              Retry Loading
            </Button>
          </div>
        </Card>
      ) : null}

      {isLoading ? (
        <Card className="text-gray-600 dark:text-[#9CA3AF] flex items-center gap-3">
          <span className="animate-spin">🌸</span>
          Loading management identities...
        </Card>
      ) : null}

      {!isLoading && !guardedError ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card variant="kawaii" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">Human Operators</h2>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                  Persisted admin accounts from `/api/admin-accounts`
                </p>
              </div>
              <Badge variant="human">{adminAccountList.length}</Badge>
            </div>

            {isAccountsLoading ? (
              <SectionLoading message="Loading admin accounts..." />
            ) : shouldShowSessionExpired && isUnauthorizedError(accountsError) ? (
              <ManagementSessionRecoveryNotice message="Sign in again to reload human operators." />
            ) : accountsErrorMessage ? (
              <SectionError
                message={`Human operator data is temporarily unavailable. ${accountsErrorMessage}`}
                actionLabel="Retry human operators"
                onRetry={retryAccounts}
                isRefreshing={refreshingAction === 'accounts'}
              />
            ) : adminAccountList.length === 0 ? (
              <EmptyState icon={<Users className="w-6 h-6" />} message="No admin accounts have been invited yet." />
            ) : filteredAdminAccounts.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6" />}
                message={`No human operators match "${searchQuery.trim()}".`}
              />
            ) : (
              <div className="space-y-3">
                {filteredAdminAccounts.map((account) => (
                  <div
                    key={account.id}
                    data-testid={`admin-card-${account.id}`}
                    data-focus-state={account.id === focus.adminId ? 'focused' : 'default'}
                    className={`rounded-2xl border bg-white/90 p-4 dark:bg-[#252540]/90 ${
                      account.id === focus.adminId
                        ? 'border-pink-400 shadow-[0_0_0_1px_rgba(236,72,153,0.18)] dark:border-pink-400'
                        : 'border-pink-100 dark:border-[#3D3D5C]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                          {account.display_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-[#9CA3AF] break-all">
                          {account.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant="human">{account.role}</Badge>
                        <Badge variant={account.status === 'active' ? 'success' : 'warning'}>{account.status}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={expandedAccounts.includes(account.id)}
                        onClick={() => {
                          setExpandedAccounts((current) =>
                            current.includes(account.id)
                              ? current.filter((id) => id !== account.id)
                              : [...current, account.id]
                          );
                        }}
                        rightIcon={
                          expandedAccounts.includes(account.id)
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />
                        }
                      >
                        {expandedAccounts.includes(account.id)
                          ? `Hide details for ${account.display_name}`
                          : `View details for ${account.display_name}`}
                      </Button>
                    </div>
                    {expandedAccounts.includes(account.id) ? (
                      <IdentityDetailsGrid
                        items={[
                          ['Account ID', account.id],
                          ['Created', formatSnapshotTimestamp(account.created_at)],
                          ['Updated', formatSnapshotTimestamp(account.updated_at)],
                          ['Last login', formatOptionalTimestamp(account.last_login_at, 'Never signed in')],
                        ]}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card variant="feature" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">AI Agents</h2>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                  Registered agent identities from `/api/agents`
                </p>
              </div>
              <Badge variant="agent">{agents.length}</Badge>
            </div>

            {agentsQuery.isLoading ? (
              <SectionLoading message="Loading agents..." />
            ) : shouldShowSessionExpired && isUnauthorizedError(agentsQuery.error) ? (
              <ManagementSessionRecoveryNotice message="Sign in again to reload agents." />
            ) : agentsErrorMessage ? (
              <SectionError
                message={`Agent data is temporarily unavailable. ${agentsErrorMessage}`}
                actionLabel="Retry agents"
                onRetry={retryAgents}
                isRefreshing={refreshingAction === 'agents'}
              />
            ) : agents.length === 0 ? (
              <EmptyState icon={<Bot className="w-6 h-6" />} message="No agents are registered yet." />
            ) : filteredAgents.length === 0 ? (
              <EmptyState
                icon={<Bot className="w-6 h-6" />}
                message={`No AI agents match "${searchQuery.trim()}".`}
              />
            ) : (
              <div className="space-y-3">
                {filteredAgents.map((agent) => {
                  const linkedTokens = tokensByAgent[agent.id] ?? [];
                  const feedbackCount = agentFeedbackCounts[agent.id] ?? 0;

                  return (
                    <div
                      key={agent.id}
                      data-testid={`agent-card-${agent.id}`}
                      data-focus-state={agent.id === focus.agentId ? 'focused' : 'default'}
                      className={`rounded-2xl border bg-white/90 p-4 dark:bg-[#252540]/90 ${
                        agent.id === focus.agentId
                          ? 'border-pink-400 shadow-[0_0_0_1px_rgba(236,72,153,0.18)] dark:border-pink-400'
                          : 'border-pink-100 dark:border-[#3D3D5C]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                            {agent.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-[#9CA3AF] break-all">
                            {agent.id}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              {linkedTokens.length} linked token{linkedTokens.length === 1 ? '' : 's'}
                            </Badge>
                            <Badge variant="secondary">
                              {feedbackCount} recent feedback event{feedbackCount === 1 ? '' : 's'}
                            </Badge>
                          </div>
                          {linkedTokens.length > 0 ? (
                            <p className="mt-2 text-sm text-gray-500 dark:text-[#9CA3AF]">
                              {linkedTokens
                                .slice(0, 2)
                                .map((token) => token.display_name ?? token.displayName ?? token.id)
                                .join(' · ')}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Badge variant="agent">{agent.risk_tier}</Badge>
                          <Badge variant="info">{agent.auth_method}</Badge>
                          <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>{agent.status}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={expandedAgents.includes(agent.id)}
                          onClick={() => {
                            setExpandedAgents((current) =>
                              current.includes(agent.id)
                                ? current.filter((id) => id !== agent.id)
                                : [...current, agent.id]
                            );
                          }}
                          rightIcon={
                            expandedAgents.includes(agent.id)
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />
                          }
                        >
                          {expandedAgents.includes(agent.id)
                            ? `Hide details for ${agent.name}`
                            : `View details for ${agent.name}`}
                        </Button>
                      </div>
                      {expandedAgents.includes(agent.id) ? (
                        <AgentManagementCard
                          agent={agent}
                          canDelete={session?.role === 'owner'}
                          events={eventsQuery.events.filter((event) => event.actor_id === agent.id)}
                          eventsErrorMessage={eventsErrorMessage}
                          isDeleting={deletingAgentId === agent.id}
                          onDelete={() => handleDeleteAgent(agent.id)}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {!isLoading && !guardedError ? (
        <Card className="border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-[#3D3D5C] flex items-center justify-center text-pink-600 dark:text-[#E891C0]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC] mb-1">
                {hasActiveSearch ? 'Filtered snapshot' : 'Live management snapshot'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                {hasActiveSearch
                  ? `Showing ${filteredAdminAccounts.length} human operators and ${filteredAgents.length} agents that match the current query. Metrics above still reflect the full backend snapshot.`
                  : 'Humans and agents are now rendered from persisted backend data, including token coverage and recent feedback visibility for each registered agent.'}
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2 border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90">
      <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{label}</p>
      <p className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
      <p className="text-xs text-gray-400 dark:text-[#9CA3AF]">{hint}</p>
    </Card>
  );
}

function CoverageMetric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-white/70 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-amber-900 dark:text-amber-100">{value}</p>
      <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">{hint}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-pink-100 dark:border-[#3D3D5C] bg-white/70 dark:bg-[#252540]/60 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 dark:bg-[#3D3D5C] text-pink-600 dark:text-[#E891C0]">
        {icon}
      </div>
      <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">{message}</p>
    </div>
  );
}

function SectionLoading({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-pink-100 dark:border-[#3D3D5C] bg-white/70 dark:bg-[#252540]/60 p-6 text-sm text-gray-600 dark:text-[#9CA3AF]">
      {message}
    </div>
  );
}

function SectionError({
  message,
  actionLabel,
  onRetry,
  isRefreshing,
}: {
  message: string;
  actionLabel: string;
  onRetry: () => Promise<void>;
  isRefreshing: boolean;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50/80 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400"
    >
      <div className="flex flex-col gap-4">
        <p>{message}</p>
        <div>
          <Button
            variant="secondary"
            size="sm"
            loading={isRefreshing}
            onClick={onRetry}
            leftIcon={!isRefreshing ? <RefreshCw className="h-4 w-4" /> : undefined}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function IdentityDetailsGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="mt-4 grid gap-3 rounded-2xl border border-dashed border-pink-100 dark:border-[#3D3D5C] bg-white/60 dark:bg-[#1E1E32]/60 p-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-gray-400 dark:text-[#9CA3AF]">{label}</dt>
          <dd className="mt-1 break-all text-sm text-gray-700 dark:text-[#E8E8EC]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AgentManagementCard({
  agent,
  canDelete,
  events,
  eventsErrorMessage,
  isDeleting,
  onDelete,
}: {
  agent: {
    id: string;
    name: string;
    risk_tier: string;
    auth_method: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  canDelete: boolean;
  events: Array<{
    id: string;
    summary: string;
    event_type: string;
    created_at: string;
  }>;
  eventsErrorMessage: string | null;
  isDeleting: boolean;
  onDelete: () => Promise<void>;
}) {
  const tokensQuery = useAgentTokens(agent.id);
  const tokens = tokensQuery.data?.items ?? [];

  return (
    <div className="mt-4 space-y-4">
      <IdentityDetailsGrid
        items={[
          ['Agent ID', agent.id],
          ['Created', formatSnapshotTimestamp(agent.created_at)],
          ['Updated', formatSnapshotTimestamp(agent.updated_at)],
          ['Authentication', agent.auth_method],
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white/70 dark:bg-[#1E1E32]/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
              Linked Tokens
            </h3>
            <Badge variant="info">{tokens.length}</Badge>
          </div>

          {tokensQuery.isLoading ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">Loading linked tokens...</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">No active tokens are linked to this agent.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div key={token.id} className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white/80 dark:bg-[#252540]/80 p-3">
                  <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                    {token.display_name ?? token.displayName}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {(token.status ?? 'unknown').toUpperCase()} · trust {(token.trust_score ?? token.trustScore ?? 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white/70 dark:bg-[#1E1E32]/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
              Recent Events
            </h3>
            <Badge variant="secondary">{events.length}</Badge>
          </div>

          {eventsErrorMessage ? (
            <p className="text-sm text-red-600 dark:text-red-400">Event feed unavailable. {eventsErrorMessage}</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">No recent agent feedback events yet.</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white/80 dark:bg-[#252540]/80 p-3">
                  <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{event.summary}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {event.event_type.replaceAll('_', ' ')} · {formatSnapshotTimestamp(event.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {canDelete ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            loading={isDeleting}
            onClick={onDelete}
            leftIcon={!isDeleting ? <Trash2 className="h-4 w-4" /> : undefined}
            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
          >
            Delete {agent.name}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function formatSnapshotTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

function formatOptionalTimestamp(value: string | undefined, fallback: string) {
  return value ? formatSnapshotTimestamp(value) : fallback;
}

function matchesAdminAccountQuery(
  account: {
    display_name: string;
    email: string;
    role: string;
    status: string;
    id: string;
  },
  query: string
) {
  if (!query) {
    return true;
  }

  return [account.display_name, account.email, account.role, account.status, account.id]
    .some((value) => value.toLowerCase().includes(query));
}

function matchesAgentQuery(
  agent: {
    name: string;
    id: string;
    risk_tier: string;
    auth_method: string;
    status: string;
  },
  query: string
) {
  if (!query) {
    return true;
  }

  return [agent.name, agent.id, agent.risk_tier, agent.auth_method, agent.status]
    .some((value) => value.toLowerCase().includes(query));
}
