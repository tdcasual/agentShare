/**
 * Operations Feed Component - 操作事件流
 */

import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { SectionNotice, formatTimestamp } from './components';
import type { Event } from '@/domains/event';
import type { Agent } from '@/domains/identity';
import { useI18n } from '@/components/i18n-provider';

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
  const { t } = useI18n();
  const activeAgents = agents.filter((agent) => agent.status === 'active');

  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-5 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--kw-text)]">Operations Space</h2>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
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
        <SectionNotice message={t('spaces.loadingEventActivity')} />
      ) : events.length === 0 ? (
        <SectionNotice message={t('spaces.noAgentActivity')} />
      ) : (
        <div role="region" aria-label="Operations feed" className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-[var(--kw-primary-50)]/40 dark:bg-[var(--kw-dark-surface-alt)]/60 rounded-2xl border border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--kw-text)]">{event.summary}</p>
                  <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
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
