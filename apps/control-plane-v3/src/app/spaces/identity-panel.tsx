/**
 * Identity Panel Component - 身份面板
 */

import { memo } from 'react';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { SectionNotice } from './components';
import type { AccessToken, OpenClawAgent } from '@/domains/identity';
import { useI18n } from '@/components/i18n-provider';
import { translateAgentStatus } from '@/lib/enum-labels';

export interface IdentityPanelProps {
  agents: OpenClawAgent[];
  accessTokensByAgentId: Record<string, AccessToken[]>;
  eventCounts: Record<string, number>;
  isLoading: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export function IdentityPanel({
  agents,
  accessTokensByAgentId,
  eventCounts,
  isLoading,
  selectedAgentId,
  onSelectAgent,
}: IdentityPanelProps) {
  const { t } = useI18n();
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-5 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--kw-text)]">
            {t('spaces.sections.identitySpaceTitle')}
          </h2>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
            {t('spaces.sections.identitySpaceDescription')}
          </p>
        </div>
        <Badge variant="info">{agents.length}</Badge>
      </div>

      {isLoading && agents.length === 0 ? (
        <SectionNotice message={t('spaces.loadingAgentRoster')} />
      ) : agents.length === 0 ? (
        <SectionNotice message={t('spaces.noAgents')} />
      ) : (
        <div className="space-y-2">
          {agents.slice(0, 4).map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              accessTokens={accessTokensByAgentId[agent.id] ?? []}
              eventCount={eventCounts[agent.id] ?? 0}
              selected={selectedAgentId === agent.id}
              onSelect={onSelectAgent}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

interface AgentRowProps {
  agent: OpenClawAgent;
  accessTokens: AccessToken[];
  eventCount: number;
  selected: boolean;
  onSelect: (agentId: string) => void;
}

const AgentRow = memo(function AgentRow({
  agent,
  accessTokens,
  eventCount,
  selected,
  onSelect,
}: AgentRowProps) {
  const { t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t('spaces.sections.identityAriaLabel', { name: agent.name })}
      className="dark:bg-[var(--kw-dark-surface-alt)]/55 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[var(--kw-text)]">
            {t('spaces.sections.identityLabel', { name: agent.name })}
          </p>
          <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
            {agent.id} · {agent.auth_method}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {accessTokens.map((token) => (
              <Badge key={token.id} variant="secondary">
                {token.displayName ?? token.id}
              </Badge>
            ))}
            <Badge variant="secondary">
              {t('spaces.sections.recentEvents', { count: eventCount })}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
            {translateAgentStatus(t, agent.status)}
          </Badge>
          <Button
            variant={selected ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onSelect(agent.id)}
          >
            {t('spaces.sections.focusIdentity', { name: agent.name })}
          </Button>
        </div>
      </div>
    </div>
  );
});
