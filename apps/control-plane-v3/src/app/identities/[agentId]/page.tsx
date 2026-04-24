'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot } from 'lucide-react';
import {
  useOpenClawAgent,
  useOpenClawAgents,
  useOpenClawSessions,
  useOpenClawDreamRuns,

  useAgentWorkbenchSessions,
} from '@/domains/identity';
import { useEvents } from '@/domains/event';
import { Layout } from '@/interfaces/human/layout';
import {
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { FilterButton } from '@/shared/ui-primitives/filter-button';
import { useI18n } from '@/components/i18n-provider';
import { translateAgentStatus } from '@/lib/enum-labels';
import { IdentityDetailsGrid, formatSnapshotTimestamp } from '../components';
import { DreamPolicyCard } from '../dream-policy-card';
import { DreamRunList } from '../dream-run-list';
import { SessionManager } from '../session-manager';
import { WorkspaceFilesManager } from '../workspace-files-manager';
import { WorkbenchPanel } from './workbench-panel';

const TABS = ['overview', 'sessions', 'workspace', 'dream', 'events', 'workbench'] as const;
type Tab = (typeof TABS)[number];

export default function AgentDetailPage() {
  return (
    <Layout>
      <AgentDetailContent />
    </Layout>
  );
}

function AgentDetailContent() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const agentsQuery = useOpenClawAgents();
  const agentQuery = useOpenClawAgent(agentId);
  const sessionsQuery = useOpenClawSessions();
  const dreamRunsQuery = useOpenClawDreamRuns();
  const eventsQuery = useEvents();
  const workbenchSessionsQuery = useAgentWorkbenchSessions(agentId);

  const {
    session,
    loading: gateLoading,
    error: gateError,
  } = useManagementPageSessionRecovery([
    agentsQuery.error,
    agentQuery.error,
    sessionsQuery.error,
    dreamRunsQuery.error,
    eventsQuery.error,
  ]);

  const agent = agentQuery.data ?? agentsQuery.data?.items.find((a) => a.id === agentId) ?? null;
  const allSessions = sessionsQuery.data?.items.filter((s) => s.agent_id === agentId) ?? [];
  const allDreamRuns = dreamRunsQuery.data?.items.filter((r) => r.agent_id === agentId) ?? [];
  const allEvents = eventsQuery.events.filter((e) => e.actor_id === agentId) ?? [];
  const workbenchSessions = workbenchSessionsQuery.data?.items ?? [];

  const isLoading = gateLoading || (!agent && agentsQuery.isLoading);

  const tabLabel = useMemo(
    () => ({
      overview: t('identities.detail.tabs.overview'),
      sessions: t('identities.detail.tabs.sessions'),
      workspace: t('identities.detail.tabs.workspace'),
      dream: t('identities.detail.tabs.dream'),
      events: t('identities.detail.tabs.events'),
      workbench: t('identities.detail.tabs.workbench'),
    }),
    [t]
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 lg:space-y-8">
        <Card className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <span className="animate-spin">🌸</span>
          {t('identities.detail.loading')}
        </Card>
      </div>
    );
  }

  if (gateError || !agent) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 lg:space-y-8">
        <Button variant="secondary" size="sm" onClick={() => router.push('/identities')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          {t('common.back')}
        </Button>
        <Card className="bg-[var(--kw-rose-surface)]/80 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)]">
          {gateError ?? t('identities.detail.notFound')}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/identities')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            {t('common.back')}
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[var(--kw-text-muted)]" />
              <h1 className="text-2xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                {agent.name}
              </h1>
            </div>
            <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {agent.id}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="agent">{agent.sandbox_mode}</Badge>
              <Badge variant="info">{agent.auth_method}</Badge>
              <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                {translateAgentStatus(t, agent.status)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <FilterButton
              key={tab}
              value={tab}
              active={activeTab === tab}
              onSelect={(v) => setActiveTab(v as Tab)}
              label={tabLabel[tab]}
            />
          ))}
        </div>
      </Card>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <IdentityDetailsGrid
            items={[
              [t('identities.labels.agentId'), agent.id],
              [t('identities.labels.workspaceRoot'), agent.workspace_root],
              [t('identities.labels.agentDirectory'), agent.agent_dir],
              [t('identities.labels.model'), agent.model ?? t('identities.labels.defaultRuntimeModel')],
              [t('identities.labels.thinkingLevel'), agent.thinking_level],
              [t('identities.labels.sandboxMode'), agent.sandbox_mode],
              [
                t('identities.labels.allowedTaskTypes'),
                agent.allowed_task_types.length > 0
                  ? agent.allowed_task_types.join(', ')
                  : t('identities.labels.noTaskRestrictions'),
              ],
              [
                t('identities.labels.allowedCapabilityIds'),
                agent.allowed_capability_ids.length > 0
                  ? agent.allowed_capability_ids.join(', ')
                  : t('identities.labels.noCapabilityRestrictions'),
              ],
            ]}
          />
          <div className="grid gap-4 xl:grid-cols-2">
            <DreamPolicyCard dreamPolicy={agent.dream_policy} />
            <DreamRunList
              runs={allDreamRuns.slice(0, 5)}
              onSelectRun={(_runId) => {
                /* noop in detail view for now */
              }}
            />
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <SessionManager
            agent={agent}
            sessions={allSessions}
            sessionErrorMessage={
              sessionsQuery.error instanceof Error ? sessionsQuery.error.message : null
            }
            canManage={session?.role === 'owner' || session?.role === 'admin'}
          />
        </Card>
      )}

      {activeTab === 'workspace' && (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <WorkspaceFilesManager agent={agent} />
        </Card>
      )}

      {activeTab === 'dream' && (
        <div className="space-y-4">
          <DreamPolicyCard dreamPolicy={agent.dream_policy} />
          <DreamRunList
            runs={allDreamRuns}
            onSelectRun={(_runId) => {
              /* noop */
            }}
          />
        </div>
      )}

      {activeTab === 'events' && (
        <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
                {t('identities.sections.recentEventsTitle')}
              </h3>
              <Badge variant="secondary">{allEvents.length}</Badge>
            </div>
            {allEvents.length === 0 ? (
              <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.sections.noRecentEvents')}</p>
            ) : (
              <div className="space-y-2">
                {allEvents.map((event) => (
                  <div
                    key={event.id}
                    className="dark:bg-[var(--kw-dark-surface)]/80 rounded-2xl border border-[var(--kw-border)] bg-white/80 p-3 dark:border-[var(--kw-dark-border)]"
                  >
                    <p className="font-medium text-[var(--kw-text)]">{event.summary}</p>
                    <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                      {event.event_type.replaceAll('_', ' ')} · {formatSnapshotTimestamp(event.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'workbench' && (
        <WorkbenchPanel
          agent={agent}
          workbenchSessions={workbenchSessions}
          isLoadingSessions={workbenchSessionsQuery.isLoading}
          sessionsError={workbenchSessionsQuery.error instanceof Error ? workbenchSessionsQuery.error.message : null}
        />
      )}
    </div>
  );
}
