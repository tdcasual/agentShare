/**
 * Agent Management Card Component
 */

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useAgentTokens } from '@/domains/identity';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { IdentityDetailsGrid, formatSnapshotTimestamp } from './components';

export interface AgentManagementCardProps {
  agent: {
    id: string;
    name: string;
    risk_tier: string;
    auth_method: string;
    status: string;
  };
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

export function AgentManagementCard({
  agent,
  canDelete,
  events,
  eventsErrorMessage,
  isDeleting,
  onDelete,
}: AgentManagementCardProps) {
  const tokensQuery = useAgentTokens(agent.id);
  const tokens = tokensQuery.data?.items ?? [];

  return (
    <div className="mt-4 space-y-4">
      <IdentityDetailsGrid
        items={[
          ['Agent ID', agent.id],
          ['Name', agent.name],
          ['Risk Tier', agent.risk_tier],
          ['Authentication', agent.auth_method],
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">
              Linked Tokens
            </h3>
            <Badge variant="info">{tokens.length}</Badge>
          </div>

          {tokensQuery.isLoading ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">Loading linked tokens...</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              No active tokens are linked to this agent.
            </p>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="rounded-2xl border border-pink-100 bg-white/80 p-3 dark:border-[#3D3D5C] dark:bg-[#252540]/80"
                >
                  <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                    {token.display_name ??
                      (token as unknown as { displayName?: string }).displayName}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    {(token.status ?? 'unknown').toUpperCase()} · trust{' '}
                    {(
                      token.trust_score ??
                      (token as unknown as { trustScore?: number }).trustScore ??
                      0
                    ).toFixed(2)}
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
            <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              No recent agent feedback events yet.
            </p>
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
        <div className="flex justify-between gap-3">
          <Link
            href="/tokens"
            className="inline-flex items-center text-sm font-medium text-pink-600 hover:text-pink-700"
          >
            Manage Tokens
          </Link>
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
