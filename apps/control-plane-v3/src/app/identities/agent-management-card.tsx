import { Trash2 } from 'lucide-react';
import { useOpenClawFiles } from '@/domains/identity';
import type { OpenClawAgent, OpenClawDreamRun, OpenClawSession } from '@/domains/identity';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { IdentityDetailsGrid, formatSnapshotTimestamp } from './components';
import { DreamPolicyCard } from './dream-policy-card';
import { DreamRunList } from './dream-run-list';

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

function formatPolicy(policy: Record<string, unknown>) {
  const entries = Object.entries(policy);
  if (entries.length === 0) {
    return 'No explicit policy';
  }

  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join(' · ');
}

function summarizeFileContent(content: string) {
  return content.split('\n').find((line) => line.trim().length > 0) ?? 'Empty file';
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
  const filesQuery = useOpenClawFiles(agent.id);
  const files = filesQuery.data?.items ?? [];

  return (
    <div className="mt-4 space-y-4">
      <IdentityDetailsGrid
        items={[
          ['Agent ID', agent.id],
          ['Workspace Root', agent.workspace_root],
          ['Agent Directory', agent.agent_dir],
          ['Model', agent.model ?? 'Default runtime model'],
          ['Thinking Level', agent.thinking_level],
          ['Sandbox Mode', agent.sandbox_mode],
          ['Allowed Task Types', formatList(agent.allowed_task_types, 'No task restrictions')],
          [
            'Allowed Capability IDs',
            formatList(agent.allowed_capability_ids, 'No capability restrictions'),
          ],
          ['Tool Policy', formatPolicy(agent.tools_policy)],
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DreamPolicyCard dreamPolicy={agent.dream_policy} />
        <DreamRunList runs={recentDreamRuns} onSelectRun={onSelectDreamRun} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
              Recent Session
            </h3>
            <Badge variant="info">{sessionCount}</Badge>
          </div>

          {sessionErrorMessage ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Session history unavailable. {sessionErrorMessage}
            </p>
          ) : recentSession === null ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              No management-visible sessions recorded for this agent yet.
            </p>
          ) : (
            <div className="rounded-2xl border border-pink-100 bg-white/80 p-3 dark:border-[#3D3D5C] dark:bg-[#252540]/80">
              <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                {recentSession.display_name}
              </p>
              <p className="mt-1 break-all text-sm text-gray-500 dark:text-[#9CA3AF]">
                {recentSession.session_key}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                {recentSession.channel}
                {recentSession.subject ? ` · ${recentSession.subject}` : ''}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                Updated {formatSnapshotTimestamp(recentSession.updated_at)}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
              Workspace Files
            </h3>
            <Badge variant="secondary">{files.length}</Badge>
          </div>

          {filesQuery.isLoading ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">Loading workspace files...</p>
          ) : filesQuery.error instanceof Error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Workspace files unavailable. {filesQuery.error.message}
            </p>
          ) : files.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              No workspace bootstrap files stored for this agent.
            </p>
          ) : (
            <div className="space-y-2">
              {files.slice(0, 3).map((file) => (
                <div
                  key={file.file_name}
                  className="rounded-2xl border border-pink-100 bg-white/80 p-3 dark:border-[#3D3D5C] dark:bg-[#252540]/80"
                >
                  <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{file.file_name}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {summarizeFileContent(file.content)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
              Recent Events
            </h3>
            <Badge variant="secondary">{events.length}</Badge>
          </div>

          {eventsErrorMessage ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              Event feed unavailable. {eventsErrorMessage}
            </p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">No recent agent events yet.</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-pink-100 bg-white/80 p-3 dark:border-[#3D3D5C] dark:bg-[#252540]/80"
                >
                  <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{event.summary}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
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
            className="border-red-300 text-red-600 hover:border-red-400 hover:bg-red-50"
          >
            Delete {agent.name}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
