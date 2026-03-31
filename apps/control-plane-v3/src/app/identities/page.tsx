'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Building2, ChevronDown, ChevronUp, FlaskConical, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { refreshAdminAccounts, refreshAgents, refreshSession, useAgents, useAdminAccounts } from '@/domains/identity';
import { ApiError } from '@/lib/api-client';
import { Layout } from '@/interfaces/human/layout';
import {
  isUnauthorizedError,
  ManagementSessionExpiredAlert,
  ManagementSessionRecoveryNotice,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
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
  const { data: adminAccountsData, isLoading: isAccountsLoading, error: accountsError } = useAdminAccounts();
  const { data: agentsData, isLoading: isAgentsLoading, error: agentsError } = useAgents();
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowSessionExpired,
    clearSessionExpired,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([accountsError, agentsError]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshingAction, setRefreshingAction] = useState<'all' | 'accounts' | 'agents' | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [expandedAgents, setExpandedAgents] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const adminAccounts = adminAccountsData?.items ?? [];
  const agents = agentsData?.items ?? [];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredAdminAccounts = useMemo(
    () => adminAccounts.filter((account) => matchesAdminAccountQuery(account, normalizedQuery)),
    [adminAccounts, normalizedQuery]
  );
  const filteredAgents = useMemo(
    () => agents.filter((agent) => matchesAgentQuery(agent, normalizedQuery)),
    [agents, normalizedQuery]
  );

  const operatorCount = adminAccounts.filter((account) => account.status === 'active').length;
  const ownerCount = adminAccounts.filter((account) => account.role === 'owner').length;
  const activeAgentCount = agents.filter((agent) => agent.status === 'active').length;
  const guardedError = gateError;
  const accountsErrorMessage = accountsError instanceof Error ? accountsError.message : null;
  const agentsErrorMessage = agentsError instanceof Error ? agentsError.message : null;

  const isLoading = gateLoading;
  const hasActiveSearch = normalizedQuery.length > 0;
  const isRefreshing = refreshingAction !== null;

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

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
              Backend-Backed Identity Snapshot
            </h2>
            <p className="text-amber-700 dark:text-amber-300 mb-4">
              This route now reads persisted management accounts and registered agents from the backend.
              Profile editing and relationship management are still pending, so the demo route remains available for exploration-only interactions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/demo/identities"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              >
                <FlaskConical className="w-4 h-4" />
                Try Demo Version
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Operators"
          value={accountsErrorMessage ? 'N/A' : operatorCount.toString()}
          hint={accountsErrorMessage ? 'accounts unavailable' : `${adminAccounts.length} total accounts`}
        />
        <MetricCard
          label="Owners"
          value={accountsErrorMessage ? 'N/A' : ownerCount.toString()}
          hint={accountsErrorMessage ? 'accounts unavailable' : 'bootstrap and governance'}
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
              <Badge variant="human">{adminAccounts.length}</Badge>
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
            ) : adminAccounts.length === 0 ? (
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
                    className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90 p-4"
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

            {isAgentsLoading ? (
              <SectionLoading message="Loading agents..." />
            ) : shouldShowSessionExpired && isUnauthorizedError(agentsError) ? (
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
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                          {agent.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-[#9CA3AF] break-all">
                          {agent.id}
                        </p>
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
                      <IdentityDetailsGrid
                        items={[
                          ['Agent ID', agent.id],
                          ['Created', formatSnapshotTimestamp(agent.created_at)],
                          ['Updated', formatSnapshotTimestamp(agent.updated_at)],
                          ['Authentication', agent.auth_method],
                        ]}
                      />
                    ) : null}
                  </div>
                ))}
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
                {hasActiveSearch ? 'Filtered snapshot' : 'What is still pending'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                {hasActiveSearch
                  ? `Showing ${filteredAdminAccounts.length} human operators and ${filteredAgents.length} agents that match the current query. Metrics above still reflect the full backend snapshot.`
                  : 'This page is now backed by persisted identity data, but editing profiles, ownership relationships, and richer activity views still need dedicated backend endpoints.'}
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
