'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Bot,
  Building2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  UserPlus,
  KeyRound,
  Plus,
} from 'lucide-react';
import {
  refreshAdminAccounts,
  refreshAgentsWithTokens,
  refreshSession,
  useAdminAccounts,
  useAgentsWithTokens,
  useDeleteAgent,
} from '@/domains/identity';
import { useEvents, refreshEvents } from '@/domains/event';
import { Layout } from '@/interfaces/human/layout';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { readFocusedEntry } from '@/lib/focused-entry';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { MetricCard, CoverageMetric } from './components';
import { HumanOperatorsSection } from './human-operators-section';
import { AIAgentsSection } from './ai-agents-section';
import type { AdminAccountSummary, Agent } from '@/domains/identity';

function matchesAdminAccountQuery(account: AdminAccountSummary, query: string) {
  if (!query) {
    return true;
  }
  return [account.display_name, account.email, account.role, account.status, account.id].some(
    (value) => value.toLowerCase().includes(query)
  );
}

function matchesAgentQuery(agent: Agent, query: string) {
  if (!query) {
    return true;
  }
  return [agent.name, agent.id, agent.risk_tier, agent.auth_method, agent.status].some((value) =>
    value.toLowerCase().includes(query)
  );
}

function IdentitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const {
    data: adminAccountsData,
    isLoading: isAccountsLoading,
    error: accountsError,
  } = useAdminAccounts();
  const agentsQuery = useAgentsWithTokens();
  const eventsQuery = useEvents();
  const deleteAgent = useDeleteAgent();
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([accountsError, agentsQuery.error, eventsQuery.error]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshingAction, setRefreshingAction] = useState<'all' | 'accounts' | 'agents' | null>(
    null
  );
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>(() =>
    focus.adminId ? [focus.adminId] : []
  );
  const [expandedAgents, setExpandedAgents] = useState<string[]>(() =>
    focus.agentId ? [focus.agentId] : []
  );
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const adminAccounts = adminAccountsData?.items;
  const agents = agentsQuery.agents;
  const tokensByAgent = agentsQuery.tokensByAgent;
  const adminAccountList = adminAccounts ?? [];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredAdminAccounts = useMemo(
    () =>
      (adminAccounts ?? []).filter((account) => matchesAdminAccountQuery(account, normalizedQuery)),
    [adminAccounts, normalizedQuery]
  );
  const filteredAgents = useMemo(
    () => agents.filter((agent) => matchesAgentQuery(agent, normalizedQuery)),
    [agents, normalizedQuery]
  );
  const focusedAdminAccount =
    adminAccountList.find((account) => account.id === focus.adminId) ?? null;
  const focusedAgent = agents.find((agent) => agent.id === focus.agentId) ?? null;
  const focusedIdentity = focusedAgent ?? focusedAdminAccount;
  const focusedIdentityLabel = focusedAgent
    ? 'Agent'
    : focusedAdminAccount
      ? 'Human operator'
      : null;

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
  const agentsWithLinkedTokensCount = agents.filter(
    (agent) => (tokensByAgent[agent.id] ?? []).length > 0
  ).length;
  const agentsWithFeedbackCount = agents.filter(
    (agent) => (agentFeedbackCounts[agent.id] ?? 0) > 0
  ).length;
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
    clearAllAuthErrors();

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
        refreshAgentsWithTokens(),
        refreshEvents(),
      ]);
    });
  }

  async function retryAccounts() {
    await runRefreshAction('accounts', refreshAdminAccounts);
  }

  async function retryAgents() {
    await runRefreshAction('agents', refreshAgentsWithTokens);
  }

  async function handleDeleteAgent(agentId: string) {
    setDeletingAgentId(agentId);
    setActionError(null);
    clearAllAuthErrors();

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

  const handleToggleAccount = (accountId: string) => {
    setExpandedAccounts((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  };

  const handleToggleAgent = (agentId: string) => {
    setExpandedAgents((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId]
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
            Identity Management
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF]">
            Review the persisted human operators and registered agents available to the management
            control plane.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
              <Badge variant="primary">Operator</Badge>
              <span className="dark:text-[#E8E8EC]">{session?.email ?? 'Loading...'}</span>
              <span className="text-gray-300 dark:text-[#3D3D5C]">•</span>
              <span>{session?.role ?? '...'}</span>
            </div>
          </Card>
          {/* Management Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/settings')}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Invite Operator
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/tokens')}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Agent
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/tokens')}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
              Issue Token
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/settings')}
              leftIcon={<Building2 className="h-4 w-4" />}
            >
              Disable Account
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
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

      {/* Focused Identity */}
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

      {/* Info Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border border-sky-100 bg-sky-50/70 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/80">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-[#2D4A5D] dark:text-sky-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-[#E8E8EC]">Human supervisors</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                Human operators supervise policy, approvals, and account hygiene across the control
                plane.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border border-green-100 bg-green-50/70 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/80">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-100 text-green-700 dark:bg-[#2D4A3D] dark:text-green-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-[#E8E8EC]">
                Agent-managed identities
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                Agents maintain their own execution identity, while humans can still inspect and
                manage their status.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Coverage Card */}
      <Card className="border border-amber-200 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-amber-800 dark:text-amber-200">
                Management coverage
              </h2>
              <p className="text-amber-700 dark:text-amber-300">
                This route now reads persisted management accounts and registered agents from the
                backend. Humans supervise governance and account hygiene while agents surface their
                runtime identity through linked tokens and feedback events.
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

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Operators"
          value={accountsErrorMessage ? 'N/A' : operatorCount.toString()}
          hint={
            accountsErrorMessage
              ? 'accounts unavailable'
              : `${adminAccountList.length} total accounts`
          }
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

      {/* Alerts */}
      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep working with live identity data." />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message="You do not have permission to access some identity data. Use an admin session to manage the full identity surface." />
      ) : null}

      {actionError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
        >
          {actionError}
        </Card>
      ) : null}

      {guardedError ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
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

      {/* Loading State */}
      {isLoading ? (
        <Card className="flex items-center gap-3 text-gray-600 dark:text-[#9CA3AF]">
          <span className="animate-spin">🌸</span>
          Loading management identities...
        </Card>
      ) : null}

      {/* Main Content */}
      {!isLoading && !guardedError ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <HumanOperatorsSection
            accounts={adminAccountList}
            filteredAccounts={filteredAdminAccounts}
            isLoading={isAccountsLoading}
            error={accountsError}
            searchQuery={searchQuery}
            expandedAccounts={expandedAccounts}
            shouldShowSessionExpired={shouldShowSessionExpired}
            shouldShowForbidden={shouldShowForbidden}
            isRefreshing={refreshingAction === 'accounts'}
            focusedAccountId={focus.adminId}
            onToggleExpand={handleToggleAccount}
            onRetry={retryAccounts}
          />

          <AIAgentsSection
            agents={agents}
            filteredAgents={filteredAgents}
            tokensByAgent={tokensByAgent}
            eventCounts={agentFeedbackCounts}
            events={eventsQuery.events}
            eventsErrorMessage={eventsErrorMessage}
            isLoading={agentsQuery.isLoading}
            error={agentsQuery.error}
            searchQuery={searchQuery}
            expandedAgents={expandedAgents}
            deletingAgentId={deletingAgentId}
            shouldShowSessionExpired={shouldShowSessionExpired}
            shouldShowForbidden={shouldShowForbidden}
            canDelete={session?.role === 'owner'}
            isRefreshing={refreshingAction === 'agents'}
            focusedAgentId={focus.agentId}
            onToggleExpand={handleToggleAgent}
            onRetry={retryAgents}
            onDelete={handleDeleteAgent}
          />
        </div>
      ) : null}

      {/* Footer */}
      {!isLoading && !guardedError ? (
        <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-600 dark:bg-[#3D3D5C] dark:text-[#E891C0]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-gray-800 dark:text-[#E8E8EC]">
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

export default function IdentitiesPage() {
  return (
    <Layout>
      <IdentitiesContent />
    </Layout>
  );
}
