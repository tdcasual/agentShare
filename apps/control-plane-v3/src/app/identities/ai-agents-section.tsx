import { Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import {
  ManagementSessionRecoveryNotice,
  isForbiddenError,
  isUnauthorizedError,
} from '@/lib/management-session-recovery';
import { EmptyState, SectionError, SectionLoading } from './components';
import { AgentManagementCard } from './agent-management-card';
import type { OpenClawAgent, OpenClawSession } from '@/domains/identity';
import type { Event } from '@/domains/event';

export interface AIAgentsSectionProps {
  agents: OpenClawAgent[];
  filteredAgents: OpenClawAgent[];
  sessionsByAgent: Record<string, OpenClawSession[]>;
  sessionsErrorMessage: string | null;
  eventCounts: Record<string, number>;
  events: Event[];
  eventsErrorMessage: string | null;
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  expandedAgents: string[];
  deletingAgentId: string | null;
  shouldShowSessionExpired: boolean;
  shouldShowForbidden?: boolean;
  canDelete: boolean;
  isRefreshing: boolean;
  focusedAgentId?: string | null;
  onToggleExpand: (agentId: string) => void;
  onRetry: () => Promise<void>;
  onDelete: (agentId: string) => Promise<void>;
}

export function AIAgentsSection({
  agents,
  filteredAgents,
  sessionsByAgent,
  sessionsErrorMessage,
  eventCounts,
  events,
  eventsErrorMessage,
  isLoading,
  error,
  searchQuery,
  expandedAgents,
  deletingAgentId,
  shouldShowSessionExpired,
  shouldShowForbidden,
  canDelete,
  isRefreshing,
  focusedAgentId,
  onToggleExpand,
  onRetry,
  onDelete,
}: AIAgentsSectionProps) {
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <Card variant="feature" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
            Agent Workspaces
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
            Workspace and runtime records from `/api/openclaw/agents` and `/api/openclaw/sessions`
          </p>
        </div>
        <Badge variant="agent">{agents.length}</Badge>
      </div>

      {isLoading ? (
        <SectionLoading message="Loading OpenClaw agents..." />
      ) : shouldShowSessionExpired && isUnauthorizedError(error) ? (
        <ManagementSessionRecoveryNotice message="Sign in again to reload OpenClaw agents." />
      ) : shouldShowForbidden && isForbiddenError(error) ? (
        <ManagementSessionRecoveryNotice message="An admin session is required to manage OpenClaw identities." />
      ) : errorMessage ? (
        <SectionError
          message={`OpenClaw agent data is temporarily unavailable. ${errorMessage}`}
          actionLabel="Retry OpenClaw data"
          onRetry={onRetry}
          isRefreshing={isRefreshing}
        />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-6 w-6" />}
          message="No OpenClaw agents are registered yet."
        />
      ) : filteredAgents.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-6 w-6" />}
          message={`No OpenClaw agents match "${searchQuery.trim()}".`}
        />
      ) : (
        <div className="space-y-3">
          {sessionsErrorMessage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Session history is temporarily unavailable. {sessionsErrorMessage}
            </div>
          ) : null}

          {eventsErrorMessage ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              Recent event feed is temporarily unavailable. {eventsErrorMessage}
            </div>
          ) : null}

          {filteredAgents.map((agent) => {
            const sessions = sessionsByAgent[agent.id] ?? [];
            const feedbackCount = eventCounts[agent.id] ?? 0;
            const isExpanded = expandedAgents.includes(agent.id);

            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                sessions={sessions}
                feedbackCount={feedbackCount}
                isExpanded={isExpanded}
                isFocused={agent.id === focusedAgentId}
                onToggleExpand={() => onToggleExpand(agent.id)}
              >
                {isExpanded ? (
                  <AgentManagementCard
                    agent={agent}
                    recentSession={sessions[0] ?? null}
                    sessionCount={sessions.length}
                    sessionErrorMessage={sessionsErrorMessage}
                    canDelete={canDelete}
                    events={events.filter((event) => event.actor_id === agent.id)}
                    eventsErrorMessage={eventsErrorMessage}
                    isDeleting={deletingAgentId === agent.id}
                    onDelete={() => onDelete(agent.id)}
                  />
                ) : null}
              </AgentCard>
            );
          })}
        </div>
      )}
    </Card>
  );
}

interface AgentCardProps {
  agent: OpenClawAgent;
  sessions: OpenClawSession[];
  feedbackCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  children?: React.ReactNode;
  isFocused?: boolean;
}

function AgentCard({
  agent,
  sessions,
  feedbackCount,
  isExpanded,
  onToggleExpand,
  children,
  isFocused,
}: AgentCardProps) {
  return (
    <div
      data-testid={`agent-card-${agent.id}`}
      data-focus-state={isFocused ? 'focused' : 'default'}
      className={`rounded-2xl border bg-white/90 p-4 dark:bg-[#252540]/90 ${
        isFocused
          ? 'border-pink-400 shadow-[0_0_0_1px_rgba(236,72,153,0.18)] dark:border-pink-400'
          : 'border-pink-100 dark:border-[#3D3D5C]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{agent.name}</p>
          <p className="break-all text-sm text-gray-500 dark:text-[#9CA3AF]">{agent.id}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {sessions.length} live session{sessions.length === 1 ? '' : 's'}
            </Badge>
            <Badge variant="secondary">
              {feedbackCount} recent event{feedbackCount === 1 ? '' : 's'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-[#9CA3AF]">
            {agent.model ?? 'default model'} · {agent.thinking_level}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="agent">{agent.sandbox_mode}</Badge>
          <Badge variant="info">{agent.auth_method}</Badge>
          <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>{agent.status}</Badge>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={isExpanded}
          onClick={onToggleExpand}
          rightIcon={
            isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          }
        >
          {isExpanded ? `Hide details for ${agent.name}` : `View details for ${agent.name}`}
        </Button>
      </div>
      {children}
    </div>
  );
}
