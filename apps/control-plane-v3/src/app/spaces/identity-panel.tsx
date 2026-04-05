/**
 * Identity Panel Component - 身份面板
 */

import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { SectionNotice } from './components';
import type { Agent } from '@/domains/identity';
import type { AgentToken } from '@/domains/task/types';

export interface IdentityPanelProps {
  agents: Agent[];
  tokensByAgent: Record<string, AgentToken[]>;
  eventCounts: Record<string, number>;
  isLoading: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export function IdentityPanel({
  agents,
  tokensByAgent,
  eventCounts,
  isLoading,
  selectedAgentId,
  onSelectAgent,
}: IdentityPanelProps) {
  return (
    <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Identity Space</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
            Active agent roster available to the management control plane.
          </p>
        </div>
        <Badge variant="info">{agents.length}</Badge>
      </div>

      {isLoading && agents.length === 0 ? (
        <SectionNotice message="Loading agent roster..." />
      ) : agents.length === 0 ? (
        <SectionNotice message="No agents are registered yet." />
      ) : (
        <div className="space-y-2">
          {agents.slice(0, 4).map((agent) => (
            <div
              key={agent.id}
              role="group"
              aria-label={`${agent.name} identity`}
              className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-[#E8E8EC]">Identity: {agent.name}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {agent.id} · {agent.auth_method}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(tokensByAgent[agent.id] ?? []).map((token) => (
                      <Badge key={token.id} variant="secondary">
                        {token.display_name ?? (token as unknown as { displayName?: string }).displayName ?? token.id}
                      </Badge>
                    ))}
                    <Badge variant="secondary">
                      {eventCounts[agent.id] ?? 0} recent event{(eventCounts[agent.id] ?? 0) === 1 ? '' : 's'}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>{agent.status}</Badge>
                  <Button
                    variant={selectedAgentId === agent.id ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => onSelectAgent(agent.id)}
                  >
                    Focus {agent.name}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
