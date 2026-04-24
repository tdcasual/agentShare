import { Trash2, Pencil, ExternalLink } from 'lucide-react';
import type { OpenClawAgent, OpenClawDreamRun, OpenClawSession } from '@/domains/identity';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { IdentityDetailsGrid, formatSnapshotTimestamp } from './components';
import { DreamPolicyCard } from './dream-policy-card';
import { DreamRunList } from './dream-run-list';
import { SessionManager } from './session-manager';
import { WorkspaceFilesManager } from './workspace-files-manager';
import { useI18n } from '@/components/i18n-provider';
import Link from 'next/link';

export interface AgentManagementCardProps {
  agent: OpenClawAgent;
  sessions: OpenClawSession[];
  recentSession: OpenClawSession | null;
  sessionCount: number;
  recentDreamRuns: OpenClawDreamRun[];
  onSelectDreamRun?: (runId: string) => void;
  sessionErrorMessage: string | null;
  canDelete: boolean;
  canEdit: boolean;
  events: Array<{
    id: string;
    summary: string;
    event_type: string;
    created_at: string;
  }>;
  eventsErrorMessage: string | null;
  isDeleting: boolean;
  onDelete: () => Promise<void>;
  onEdit: () => void;
}

function formatList(values: string[], fallback: string) {
  return values.length > 0 ? values.join(', ') : fallback;
}

function formatPolicy(policy: Record<string, unknown>, t: (key: string) => string) {
  const entries = Object.entries(policy);
  if (entries.length === 0) {
    return t('identities.labels.noExplicitPolicy');
  }

  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join(' · ');
}

export function AgentManagementCard({
  agent,
  sessions,
  recentSession: _recentSession,
  sessionCount: _sessionCount,
  recentDreamRuns,
  onSelectDreamRun,
  sessionErrorMessage,
  canDelete,
  canEdit,
  events,
  eventsErrorMessage,
  isDeleting,
  onDelete,
  onEdit,
}: AgentManagementCardProps) {
  const { t } = useI18n();

  return (
    <div className="mt-4 space-y-4">
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
            formatList(agent.allowed_task_types, t('identities.labels.noTaskRestrictions')),
          ],
          [
            t('identities.labels.allowedCapabilityIds'),
            formatList(
              agent.allowed_capability_ids,
              t('identities.labels.noCapabilityRestrictions')
            ),
          ],
          [t('identities.labels.toolPolicy'), formatPolicy(agent.tools_policy, t)],
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DreamPolicyCard dreamPolicy={agent.dream_policy} />
        <DreamRunList runs={recentDreamRuns} onSelectRun={onSelectDreamRun} />
      </div>

      <div className="space-y-4">
        <SessionManager
          agent={agent}
          sessions={sessions}
          sessionErrorMessage={sessionErrorMessage}
          canManage={canEdit}
        />
        <WorkspaceFilesManager agent={agent} />

        <div className="dark:bg-[var(--kw-dark-surface-alt)]/60 space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
              {t('identities.sections.recentEventsTitle')}
            </h3>
            <Badge variant="secondary">{events.length}</Badge>
          </div>

          {eventsErrorMessage ? (
            <p className="text-sm text-[var(--kw-error)] dark:text-[var(--kw-error)]">
              {t('identities.sections.recentEventsUnavailable', {
                message: eventsErrorMessage,
              })}
            </p>
          ) : events.length === 0 ? (
            <p className="text-sm text-[var(--kw-text-muted)]">
              {t('identities.sections.noRecentEvents')}
            </p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="dark:bg-[var(--kw-dark-surface)]/80 rounded-2xl border border-[var(--kw-border)] bg-white/80 p-3 dark:border-[var(--kw-dark-border)]"
                >
                  <p className="font-medium text-[var(--kw-text)]">{event.summary}</p>
                  <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                    {event.event_type.replaceAll('_', ' ')} ·{' '}
                    {formatSnapshotTimestamp(event.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/identities/${agent.id}`}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ExternalLink className="h-4 w-4" />}
          >
            {t('identities.agentModal.openWorkbench')}
          </Button>
        </Link>
        {canEdit ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            leftIcon={<Pencil className="h-4 w-4" />}
          >
            {t('common.edit')}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            variant="outline"
            size="sm"
            loading={isDeleting}
            onClick={onDelete}
            leftIcon={!isDeleting ? <Trash2 className="h-4 w-4" /> : undefined}
            className="border-[var(--kw-error)] text-[var(--kw-error)] hover:border-[var(--kw-error)] hover:bg-[var(--kw-rose-surface)]"
          >
            {t('identities.sections.deleteAgent', { name: agent.name })}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
