'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bot, Building2, RefreshCw, Search, ShieldCheck, Users, UserPlus } from 'lucide-react';
import {
  refreshAdminAccounts,
  refreshOpenClawAgents,
  refreshOpenClawDreamRuns,
  refreshOpenClawSessions,
  refreshSession,
  useAdminAccounts,
  useDeleteOpenClawAgent,
  useOpenClawAgents,
  useOpenClawDreamRuns,
  usePauseOpenClawDreamRun,
  useResumeOpenClawDreamRun,
  useOpenClawSessions,
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
import { DreamRunDetailCard } from './dream-run-detail-card';
import type {
  AdminAccountSummary,
  OpenClawAgent,
  OpenClawDreamRun,
  OpenClawSession,
} from '@/domains/identity';

const EMPTY_ADMIN_ACCOUNTS: AdminAccountSummary[] = [];
const EMPTY_OPENCLAW_AGENTS: OpenClawAgent[] = [];
const EMPTY_OPENCLAW_SESSIONS: OpenClawSession[] = [];
const EMPTY_OPENCLAW_DREAM_RUNS: OpenClawDreamRun[] = [];

function matchesAdminAccountQuery(account: AdminAccountSummary, query: string) {
  if (!query) {
    return true;
  }
  return [account.display_name, account.email, account.role, account.status, account.id].some(
    (value) => value.toLowerCase().includes(query)
  );
}

function matchesAgentQuery(agent: OpenClawAgent, query: string) {
  if (!query) {
    return true;
  }
  return [
    agent.name,
    agent.id,
    agent.risk_tier,
    agent.auth_method,
    agent.status,
    agent.workspace_root,
    agent.agent_dir,
    agent.model,
    agent.thinking_level,
    agent.sandbox_mode,
    agent.dream_policy.enabled ? 'dream-enabled' : 'dream-disabled',
    ...agent.allowed_task_types,
    ...agent.allowed_capability_ids,
  ].some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(query)
  );
}

function groupSessionsByAgent(sessions: OpenClawSession[]) {
  return sessions.reduce<Record<string, OpenClawSession[]>>((groups, session) => {
    groups[session.agent_id] = [...(groups[session.agent_id] ?? []), session];
    return groups;
  }, {});
}

function groupDreamRunsByAgent(runs: OpenClawDreamRun[]) {
  return runs.reduce<Record<string, OpenClawDreamRun[]>>((groups, run) => {
    groups[run.agent_id] = [...(groups[run.agent_id] ?? []), run];
    return groups;
  }, {});
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
  const agentsQuery = useOpenClawAgents();
  const sessionsQuery = useOpenClawSessions();
  const dreamRunsQuery = useOpenClawDreamRuns();
  const eventsQuery = useEvents();
  const deleteAgent = useDeleteOpenClawAgent();
  const pauseDreamRun = usePauseOpenClawDreamRun();
  const resumeDreamRun = useResumeOpenClawDreamRun();
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([
    accountsError,
    agentsQuery.error,
    sessionsQuery.error,
    dreamRunsQuery.error,
    eventsQuery.error,
  ]);
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
  const [pausingDreamRunId, setPausingDreamRunId] = useState<string | null>(null);
  const [resumingDreamRunId, setResumingDreamRunId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const adminAccounts = adminAccountsData?.items ?? EMPTY_ADMIN_ACCOUNTS;
  const agents = agentsQuery.data?.items ?? EMPTY_OPENCLAW_AGENTS;
  const sessions = sessionsQuery.data?.items ?? EMPTY_OPENCLAW_SESSIONS;
  const dreamRuns = dreamRunsQuery.data?.items ?? EMPTY_OPENCLAW_DREAM_RUNS;
  const sessionsByAgent = useMemo(() => groupSessionsByAgent(sessions), [sessions]);
  const dreamRunsByAgent = useMemo(() => groupDreamRunsByAgent(dreamRuns), [dreamRuns]);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredAdminAccounts = useMemo(
    () => adminAccounts.filter((account) => matchesAdminAccountQuery(account, normalizedQuery)),
    [adminAccounts, normalizedQuery]
  );
  const filteredAgents = useMemo(
    () => agents.filter((agent) => matchesAgentQuery(agent, normalizedQuery)),
    [agents, normalizedQuery]
  );
  const focusedAdminAccount = adminAccounts.find((account) => account.id === focus.adminId) ?? null;
  const focusedAgent = agents.find((agent) => agent.id === focus.agentId) ?? null;
  const focusedDreamRun = dreamRuns.find((run) => run.id === focus.dreamRunId) ?? null;
  const focusedIdentity = focusedAgent ?? focusedAdminAccount;
  const focusedIdentityLabel = focusedAgent
    ? 'OpenClaw agent'
    : focusedAdminAccount
      ? 'Human operator'
      : null;

  const operatorCount = adminAccounts.filter((account) => account.status === 'active').length;
  const ownerCount = adminAccounts.filter((account) => account.role === 'owner').length;
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
  const agentsWithSessionsCount = agents.filter(
    (agent) => (sessionsByAgent[agent.id] ?? []).length > 0
  ).length;
  const workspaceReadyCount = agents.filter(
    (agent) => agent.workspace_root.trim() !== '' && agent.agent_dir.trim() !== ''
  ).length;
  const agentsWithFeedbackCount = agents.filter(
    (agent) => (agentFeedbackCounts[agent.id] ?? 0) > 0
  ).length;
  const guardedError = gateError;
  const accountsErrorMessage = accountsError instanceof Error ? accountsError.message : null;
  const agentsErrorMessage = agentsQuery.error instanceof Error ? agentsQuery.error.message : null;
  const sessionsErrorMessage =
    sessionsQuery.error instanceof Error ? sessionsQuery.error.message : null;
  const eventsErrorMessage = eventsQuery.error instanceof Error ? eventsQuery.error.message : null;

  const isLoading =
    gateLoading ||
    ((isAccountsLoading || agentsQuery.isLoading) &&
      adminAccounts.length === 0 &&
      agents.length === 0);
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
        refreshOpenClawAgents(),
        refreshOpenClawSessions(),
        refreshOpenClawDreamRuns(),
        refreshEvents(),
      ]);
    });
  }

  async function retryAccounts() {
    await runRefreshAction('accounts', refreshAdminAccounts);
  }

  async function retryAgents() {
    await runRefreshAction('agents', async () => {
      await Promise.all([refreshOpenClawAgents(), refreshOpenClawSessions(), refreshEvents()]);
      await refreshOpenClawDreamRuns();
    });
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

  async function handlePauseDreamRun(runId: string) {
    setPausingDreamRunId(runId);
    setActionError(null);
    clearAllAuthErrors();

    try {
      await pauseDreamRun(runId, 'operator_paused');
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }
      setActionError(error instanceof Error ? error.message : 'Failed to pause dream run');
    } finally {
      setPausingDreamRunId(null);
    }
  }

  async function handleResumeDreamRun(runId: string) {
    setResumingDreamRunId(runId);
    setActionError(null);
    clearAllAuthErrors();

    try {
      await resumeDreamRun(runId);
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }
      setActionError(error instanceof Error ? error.message : 'Failed to resume dream run');
    } finally {
      setResumingDreamRunId(null);
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

  const handleSelectDreamRun = (agentId: string, runId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('agentId', agentId);
    params.set('dreamRunId', runId);
    router.push(`/identities?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
            Identity Management
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF]">
            Review persisted human operators and in-project OpenClaw-native agents. Remote-access
            tokens for external machines remain on the dedicated Tokens page.
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
              onClick={() => router.push('/spaces')}
              leftIcon={<Building2 className="h-4 w-4" />}
            >
              Review Spaces
            </Button>
          </div>
        </div>
      </div>

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
                placeholder="Search identities by name, sandbox mode, workspace path, or id"
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

      {focusedDreamRun ? (
        <DreamRunDetailCard
          run={focusedDreamRun}
          canControl={session?.role === 'owner' || session?.role === 'admin'}
          isPausing={pausingDreamRunId === focusedDreamRun.id}
          isResuming={resumingDreamRunId === focusedDreamRun.id}
          onPause={() => handlePauseDreamRun(focusedDreamRun.id)}
          onResume={() => handleResumeDreamRun(focusedDreamRun.id)}
        />
      ) : null}

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
                OpenClaw runtime identities
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#9CA3AF]">
                Agents now surface workspace roots, session history, sandbox posture, and tool
                policy instead of linked token state.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-amber-200 bg-amber-50/90 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-amber-800 dark:text-amber-200">
                OpenClaw coverage
              </h2>
              <p className="text-amber-700 dark:text-amber-300">
                This route now reads persisted management accounts plus OpenClaw workspaces and
                session telemetry from the backend. Humans supervise governance while agents expose
                runtime posture through sessions, workspace files, and recent events.
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
              label="Agents with live sessions"
              value={agentsWithSessionsCount.toString()}
              hint={`${Math.max(agents.length - agentsWithSessionsCount, 0)} awaiting first runtime session`}
            />
            <CoverageMetric
              label="Workspace-ready agents"
              value={workspaceReadyCount.toString()}
              hint={`${Math.max(agents.length - workspaceReadyCount, 0)} missing workspace metadata`}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Operators"
          value={accountsErrorMessage ? 'N/A' : operatorCount.toString()}
          hint={
            accountsErrorMessage ? 'accounts unavailable' : `${adminAccounts.length} total accounts`
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

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep working with live identity data." />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message="You do not have permission to access some identity data. Use an admin session to manage the full OpenClaw identity surface." />
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

      {guardedError && !shouldShowSessionExpired && !shouldShowForbidden ? (
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

      {isLoading ? (
        <Card className="flex items-center gap-3 text-gray-600 dark:text-[#9CA3AF]">
          <span className="animate-spin">🌸</span>
          Loading management identities...
        </Card>
      ) : null}

      {!isLoading && !guardedError ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <HumanOperatorsSection
            accounts={adminAccounts}
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
            sessionsByAgent={sessionsByAgent}
            dreamRunsByAgent={dreamRunsByAgent}
            sessionsErrorMessage={sessionsErrorMessage}
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
            onSelectDreamRun={handleSelectDreamRun}
            onRetry={retryAgents}
            onDelete={handleDeleteAgent}
          />
        </div>
      ) : null}

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
                  ? `Showing ${filteredAdminAccounts.length} human operators and ${filteredAgents.length} workspace runtimes that match the current query. Metrics above still reflect the full backend snapshot.`
                  : `Humans and workspace runtimes are now rendered from persisted backend data, including ${agentsWithFeedbackCount} agent${agentsWithFeedbackCount === 1 ? '' : 's'} with recent feedback visibility.`}
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
