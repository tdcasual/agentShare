import { Trash2 } from 'lucide-react';
import { useOpenClawFiles } from '@/domains/identity';
import type { OpenClawAgent, OpenClawDreamRun, OpenClawSession } from '@/domains/identity';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { IdentityDetailsGrid, formatSnapshotTimestamp } from './components';
import { DreamPolicyCard } from './dream-policy-card';
import { DreamRunList } from './dream-run-list';
import { useI18n } from '@/components/i18n-provider';

export interface AgentManagementCardProps {
  agent: OpenClawAgent;
  recentSession: OpenClawSession | null;
  sessionCount: number;
  recentDreamRuns: OpenClawDreamRun[];
  onSelectDreamRun?: (runId: string) => void;
  sessionErrorMessage: string | null;
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

function summarizeFileContent(content: string, t: (key: string) => string) {
  return content.split('\n').find((line) => line.trim().length > 0) ?? t('identities.labels.emptyFile');
}

export function AgentManagementCard({
  agent,
  recentSession,
  sessionCount,
  recentDreamRuns,
  onSelectDreamRun,
  sessionErrorMessage,
  canDelete,
  events,
  eventsErrorMessage,
  isDeleting,
  onDelete,
}: AgentManagementCardProps) {
  const { t } = useI18n();
  const filesQuery = useOpenClawFiles(agent.id);
  const files = filesQuery.data?.items ?? [];

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
          [t('identities.labels.allowedTaskTypes'), formatList(agent.allowed_task_types, t('identities.labels.noTaskRestrictions'))],
          [
            t('identities.labels.allowedCapabilityIds'),
            formatList(agent.allowed_capability_ids, t('identities.labels.noCapabilityRestrictions')),
          ],
          [t('identities.labels.toolPolicy'), formatPolicy(agent.tools_policy, t)],
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DreamPolicyCard dreamPolicy={agent.dream_policy} />
        <DreamRunList runs={recentDreamRuns} onSelectRun={onSelectDreamRun} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface-alt)]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
              Recent Session
            </h3>
            <Badge variant="info">{sessionCount}</Badge>
          </div>

          {sessionErrorMessage ? (
            <p className="text-sm text-[var(--kw-error)] dark:text-[var(--kw-error)]">
              Session history unavailable. {sessionErrorMessage}
            </p>
          ) : recentSession === null ? (
            <p className="text-sm text-[var(--kw-text-muted)]">
              No management-visible sessions recorded for this agent yet.
            </p>
          ) : (
            <div className="rounded-2xl border border-[var(--kw-border)] bg-white/80 p-3 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80">
              <p className="font-medium text-[var(--kw-text)]">
                {recentSession.display_name}
              </p>
              <p className="mt-1 break-all text-sm text-[var(--kw-text-muted)]">
                {recentSession.session_key}
              </p>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                {recentSession.channel}
                {recentSession.subject ? ` · ${recentSession.subject}` : ''}
              </p>
              <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                Updated {formatSnapshotTimestamp(recentSession.updated_at)}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface-alt)]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
              Workspace Files
            </h3>
            <Badge variant="secondary">{files.length}</Badge>
          </div>

          {filesQuery.isLoading ? (
            <p className="text-sm text-[var(--kw-text-muted)]">{t('identities.loadingWorkspaceFiles')}</p>
          ) : filesQuery.error instanceof Error ? (
            <p className="text-sm text-[var(--kw-error)] dark:text-[var(--kw-error)]">
              {t('identities.workspaceFilesUnavailable')} {filesQuery.error.message}
            </p>
          ) : files.length === 0 ? (
            <p className="text-sm text-[var(--kw-text-muted)]">
              {t('identities.noWorkspaceFiles')}
            </p>
          ) : (
            <div className="space-y-2">
              {files.slice(0, 3).map((file) => (
                <div
                  key={file.file_name}
                  className="rounded-2xl border border-[var(--kw-border)] bg-white/80 p-3 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80"
                >
                  <p className="font-medium text-[var(--kw-text)]">{file.file_name}</p>
                  <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                    {summarizeFileContent(file.content, t)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface-alt)]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)]">
              Recent Events
            </h3>
            <Badge variant="secondary">{events.length}</Badge>
          </div>

          {eventsErrorMessage ? (
            <p className="text-sm text-[var(--kw-error)] dark:text-[var(--kw-error)]">
              Event feed unavailable. {eventsErrorMessage}
            </p>
          ) : events.length === 0 ? (
            <p className="text-sm text-[var(--kw-text-muted)]">No recent agent events yet.</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-[var(--kw-border)] bg-white/80 p-3 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/80"
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

      {canDelete ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            loading={isDeleting}
            onClick={onDelete}
            leftIcon={!isDeleting ? <Trash2 className="h-4 w-4" /> : undefined}
            className="border-[var(--kw-error)] text-[var(--kw-error)] hover:border-[var(--kw-error)] hover:bg-[var(--kw-rose-surface)]"
          >
            Delete {agent.name}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
