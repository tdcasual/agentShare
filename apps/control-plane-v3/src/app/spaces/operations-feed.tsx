/**
 * Operations Feed Component - 操作事件流
 */

import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { SectionNotice, formatTimestamp } from './components';
import type { Event } from '@/domains/event';
import type { Agent } from '@/domains/identity';

export interface OperationsFeedProps {
  events: Event[];
  agents: Agent[];
  isLoading: boolean;
  selectedAgentId: string | null;
  selectedEventType: 'all' | 'completed' | 'failed';
  onSelectAgent: (agentId: string | null) => void;
  onSelectEventType: (type: 'all' | 'completed' | 'failed') => void;
}

export function OperationsFeed({
  events,
  agents,
  isLoading,
  selectedAgentId,
  selectedEventType,
  onSelectAgent,
  onSelectEventType,
}: OperationsFeedProps) {
  const activeAgents = agents.filter((agent) => agent.status === 'active');

  return (
    <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">
            Operations Space
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
            Recent agent feedback and runtime activity flowing through the inbox event stream.
          </p>
        </div>
        <Badge variant="agent">{events.length}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedAgentId === null ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedAgentId === null}
          onClick={() => onSelectAgent(null)}
        >
          All agents
        </Button>
        {activeAgents.map((agent) => (
          <Button
            key={agent.id}
            variant={selectedAgentId === agent.id ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={selectedAgentId === agent.id}
            onClick={() => onSelectAgent(agent.id)}
            aria-label={`Show activity for ${agent.id}`}
          >
            Agent {agent.name}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedEventType === 'all' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedEventType === 'all'}
          onClick={() => onSelectEventType('all')}
        >
          All activity
        </Button>
        <Button
          variant={selectedEventType === 'completed' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedEventType === 'completed'}
          onClick={() => onSelectEventType('completed')}
        >
          Completed
        </Button>
        <Button
          variant={selectedEventType === 'failed' ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={selectedEventType === 'failed'}
          onClick={() => onSelectEventType('failed')}
        >
          Failed
        </Button>
      </div>

      {isLoading && events.length === 0 ? (
        <SectionNotice message="Loading event activity..." />
      ) : events.length === 0 ? (
        <SectionNotice message="No agent activity has landed in the workspace yet." />
      ) : (
        <div role="region" aria-label="Operations feed" className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-[#E8E8EC]">{event.summary}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {event.actor_id} · {event.event_type.replaceAll('_', ' ')}
                  </p>
                </div>
                <Badge variant="secondary">{formatTimestamp(event.created_at)}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
