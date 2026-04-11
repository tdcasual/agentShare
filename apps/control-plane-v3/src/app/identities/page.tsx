'use client';

import { useMemo, useState, memo } from 'react';
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
import { useI18n } from '@/components/i18n-provider';

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

const IdentitiesContent = memo(function IdentitiesContent() {
  const { t } = useI18n();
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
    ? t('identities.agentType.openclaw')
    : focusedAdminAccount
      ? t('identities.agentType.human')
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
      setActionError(error instanceof Error ? error.message : t('identities.refreshFailed'));
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
      setActionError(error instanceof Error ? error.message : t('identities.deleteFailed'));
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
      setActionError(error instanceof Error ? error.message : t('identities.pauseFailed'));
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
      setActionError(error instanceof Error ? error.message : t('identities.resumeFailed'));
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
          <h1 className="mb-2 text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            Identity Management
          </h1>
          <p className="text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            Review persisted human operators and in-project OpenClaw-native agents. Remote-access
            tokens for external machines remain on the dedicated Tokens page.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              <Badge variant="primary">Operator</Badge>
              <span className="dark:text-[var(--kw-dark-text)]">
                {session?.email ?? t('common.loading')}
              </span>
              <span className="text-[var(--kw-border)] dark:text-[var(--kw-dark-border)]">•</span>
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

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex-1">
            <span className="sr-only">Search identities</span>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--kw-border)] bg-white px-4 py-3 text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text-muted)]">
              <Search className="h-4 w-4 flex-shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('identities.searchPlaceholder')}
                aria-label={t('common.searchIdentities')}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--kw-text-muted)] dark:placeholder:text-[var(--kw-dark-text-muted)]"
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
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              {t('identities.focusedIdentity')}
            </p>
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {'name' in focusedIdentity ? focusedIdentity.name : focusedIdentity.display_name}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
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
        <Card className="bg-[var(--kw-sky-surface)]/70 dark:bg-[var(--kw-dark-bg)]/80 border border-[var(--kw-sky-surface)] dark:border-[var(--kw-dark-border)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] dark:bg-[var(--kw-dark-sky-accent-surface)] dark:text-[var(--kw-dark-sky)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                Human supervisors
              </h2>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                Human operators supervise policy, approvals, and account hygiene across the control
                plane.
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-[var(--kw-green-surface)]/70 dark:bg-[var(--kw-dark-bg)]/80 border border-[var(--kw-green-surface)] dark:border-[var(--kw-dark-border)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:bg-[var(--kw-dark-green-accent-surface)] dark:text-[var(--kw-dark-mint)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                OpenClaw runtime identities
              </h2>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                Agents now surface workspace roots, session history, sandbox posture, and tool
                policy instead of linked token state.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-[var(--kw-amber-surface)]/90 dark:bg-[var(--kw-dark-amber-surface)]/20 border border-[var(--kw-amber-surface)] dark:border-[var(--kw-dark-amber-surface)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="dark:bg-[var(--kw-dark-amber-surface)]/30 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--kw-amber-surface)]">
              <ShieldCheck className="h-6 w-6 text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]" />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
                OpenClaw coverage
              </h2>
              <p className="text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
                This route now reads persisted management accounts plus OpenClaw workspaces and
                session telemetry from the backend. Humans supervise governance while agents expose
                runtime posture through sessions, workspace files, and recent events.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <CoverageMetric
              label={t('identities.metrics.humanCoverage')}
              value={`${ownerCount} owner${ownerCount === 1 ? '' : 's'}`}
              hint={`${operatorCount} active operator${operatorCount === 1 ? '' : 's'} on duty`}
            />
            <CoverageMetric
              label={t('identities.metrics.agentsWithSessions')}
              value={agentsWithSessionsCount.toString()}
              hint={`${Math.max(agents.length - agentsWithSessionsCount, 0)} awaiting first runtime session`}
            />
            <CoverageMetric
              label={t('identities.metrics.workspaceReadyAgents')}
              value={workspaceReadyCount.toString()}
              hint={`${Math.max(agents.length - workspaceReadyCount, 0)} missing workspace metadata`}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label={t('identities.metrics.activeOperators')}
          value={accountsErrorMessage ? t('common.nA') : operatorCount.toString()}
          hint={
            accountsErrorMessage
              ? t('identities.accountsUnavailable')
              : t('common.totalAccounts', { count: adminAccounts.length })
          }
        />
        <MetricCard
          label={t('identities.metrics.owners')}
          value={accountsErrorMessage ? t('common.nA') : ownerCount.toString()}
          hint={
            accountsErrorMessage ? t('identities.accountsUnavailable') : t('identities.ownersHint')
          }
        />
        <MetricCard
          label={t('identities.metrics.activeAgents')}
          value={agentsErrorMessage ? t('common.nA') : activeAgentCount.toString()}
          hint={
            agentsErrorMessage
              ? t('identities.agentsUnavailable')
              : t('common.registeredAgents', { count: agents.length })
          }
        />
      </div>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={t('identities.sessionExpired')} />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t('identities.sessionForbidden')} />
      ) : null}

      {actionError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
        >
          {actionError}
        </Card>
      ) : null}

      {guardedError && !shouldShowSessionExpired && !shouldShowForbidden ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
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
        <Card className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <span className="animate-spin">🌸</span>
          {t('identities.loadingManagementIdentities')}
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
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {hasActiveSearch
                  ? t('identities.snapshot.filtered')
                  : t('identities.snapshot.live')}
              </h3>
              <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
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
});

export default function IdentitiesPage() {
  return (
    <Layout>
      <IdentitiesContent />
    </Layout>
  );
}
