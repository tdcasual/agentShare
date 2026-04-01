'use client';

import { useMemo, useState } from 'react';
import { Bot, Boxes, CheckCircle2, ShieldCheck, Sparkles, Wrench, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ManagementRouteGuard } from '@/components/route-guard';
import { useEvents } from '@/domains/event';
import { useCapabilities, useSecrets } from '@/domains/governance';
import { useAgentsWithTokens } from '@/domains/identity';
import { useApproveReview, useRejectReview, useReviews } from '@/domains/review';
import { Layout } from '@/interfaces/human/layout';
import { readFocusedEntry } from '@/lib/focused-entry';
import {
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';

function SpacesContent() {
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => focus.agentId ?? null);
  const [selectedEventType, setSelectedEventType] = useState<'all' | 'completed' | 'failed'>('all');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<'all' | 'pending' | 'rejected'>('pending');
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const eventsQuery = useEvents();
  const reviewsQuery = useReviews();
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  const agentsQuery = useAgentsWithTokens();
  const secretsQuery = useSecrets();
  const capabilitiesQuery = useCapabilities();
  const {
    error: gateError,
    shouldShowSessionExpired,
    clearSessionExpired,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([
    eventsQuery.error,
    reviewsQuery.error,
    agentsQuery.error,
    secretsQuery.error,
    capabilitiesQuery.error,
  ]);

  const events = eventsQuery.events;
  const reviewItems = reviewsQuery.data?.items ?? [];
  const agents = agentsQuery.agents;
  const tokensByAgent = agentsQuery.tokensByAgent;
  const secrets = secretsQuery.data?.items ?? [];
  const capabilities = capabilitiesQuery.data?.items ?? [];

  const pendingReviews = reviewItems.filter((item) => item.publication_status === 'pending_review');
  const rejectedReviews = reviewItems.filter((item) => item.publication_status === 'rejected');
  const activeAgents = agents.filter((agent) => agent.status === 'active');
  const agentEventCounts = useMemo(
    () =>
      events
        .filter((event) => event.actor_type === 'agent')
        .reduce<Record<string, number>>((counts, event) => {
          counts[event.actor_id] = (counts[event.actor_id] ?? 0) + 1;
          return counts;
        }, {}),
    [events]
  );
  const recentAgentEvents = useMemo(
    () =>
      events
        .filter((event) => event.actor_type === 'agent')
        .filter((event) => !selectedAgentId || event.actor_id === selectedAgentId)
        .filter((event) => {
          if (selectedEventType === 'completed') {
            return event.event_type.includes('completed');
          }
          if (selectedEventType === 'failed') {
            return event.event_type.includes('failed');
          }
          return true;
        })
        .slice(0, 5),
    [events, selectedAgentId, selectedEventType]
  );
  const visibleReviews = useMemo(() => {
    if (selectedReviewStatus === 'pending') {
      return pendingReviews;
    }
    if (selectedReviewStatus === 'rejected') {
      return rejectedReviews;
    }
    return reviewItems;
  }, [pendingReviews, rejectedReviews, reviewItems, selectedReviewStatus]);
  const publishedAssets = secrets.filter((item) => item.publication_status === 'active');
  const publishedSkills = capabilities.filter((item) => item.publication_status === 'active');
  const focusedAgent = agents.find((agent) => agent.id === focus.agentId) ?? null;
  const focusedEvent = events.find((event) => event.id === focus.eventId) ?? null;

  async function handleApproveReview(resourceKind: string, resourceId: string) {
    const nextActionKey = `approve:${resourceKind}:${resourceId}`;
    const reviewedItem = reviewItems.find(
      (item) => item.resource_kind === resourceKind && item.resource_id === resourceId
    );
    setActionKey(nextActionKey);
    setActionError(null);
    setActionNotice(null);
    clearSessionExpired();

    try {
      await approveReview(resourceKind, resourceId);
      setActionNotice(`Approved ${reviewedItem?.title ?? resourceId}.`);
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }

      setActionError(error instanceof Error ? error.message : 'Failed to approve review item');
    } finally {
      setActionKey(null);
    }
  }

  async function handleRejectReview(resourceKind: string, resourceId: string) {
    const nextActionKey = `reject:${resourceKind}:${resourceId}`;
    const reviewedItem = reviewItems.find(
      (item) => item.resource_kind === resourceKind && item.resource_id === resourceId
    );
    setActionKey(nextActionKey);
    setActionError(null);
    setActionNotice(null);
    clearSessionExpired();

    try {
      await rejectReview(resourceKind, resourceId, { reason: '' });
      setActionNotice(`Rejected ${reviewedItem?.title ?? resourceId}.`);
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }

      setActionError(error instanceof Error ? error.message : 'Failed to reject review item');
    } finally {
      setActionKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-pink-100 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.14),_transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,247,237,0.94))] p-8 dark:border-[#3D3D5C] dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.12),_transparent_35%),linear-gradient(135deg,rgba(37,37,64,0.98),rgba(26,26,46,0.96))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 dark:border-[#4A4568] dark:bg-[#1E1E32]/70 dark:text-orange-300">
              <Sparkles className="h-3.5 w-3.5" />
              Operations Space
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-[#E8E8EC]">
              Live collaboration workspace for humans and agents.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600 dark:text-[#9CA3AF]">
              This space aggregates the current operating picture across agent feedback, governance review, identities,
              and published market inventory so human supervisors can coordinate from one backend-backed surface.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Recent events" value={events.length.toString()} icon={<Sparkles className="h-4 w-4" />} />
            <MetricCard label="Pending reviews" value={pendingReviews.length.toString()} icon={<ShieldCheck className="h-4 w-4" />} />
            <MetricCard label="Active agents" value={activeAgents.length.toString()} icon={<Bot className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      {focusedAgent || focusedEvent ? (
        <Card className="border border-pink-200 bg-pink-50/70 dark:border-pink-500/60 dark:bg-pink-500/10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
              Focused workspace context
            </p>
            {focusedAgent ? (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E8E8EC]">{focusedAgent.name}</h2>
            ) : null}
            {focusedEvent ? (
              <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">Event summary: {focusedEvent.summary}</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep operating the workspace." />
      ) : null}

      {actionNotice ? (
        <Card
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="border border-green-100 bg-green-50/80 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400"
        >
          {actionNotice}
        </Card>
      ) : null}

      {!shouldShowSessionExpired && (actionError || gateError) ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
        >
          {actionError ?? gateError}
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Operations Space</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                Recent agent feedback and runtime activity flowing through the inbox event stream.
              </p>
            </div>
            <Badge variant="agent">{recentAgentEvents.length}</Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedAgentId === null ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedAgentId(null)}
            >
              All agents
            </Button>
            {activeAgents.map((agent) => (
              <Button
                key={agent.id}
                variant={selectedAgentId === agent.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedAgentId(agent.id)}
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
              onClick={() => setSelectedEventType('all')}
            >
              All activity
            </Button>
            <Button
              variant={selectedEventType === 'completed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedEventType('completed')}
            >
              Completed
            </Button>
            <Button
              variant={selectedEventType === 'failed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setSelectedEventType('failed')}
            >
              Failed
            </Button>
          </div>

          {eventsQuery.isLoading && recentAgentEvents.length === 0 ? (
            <SectionNotice message="Loading event activity..." />
          ) : recentAgentEvents.length === 0 ? (
            <SectionNotice message="No agent activity has landed in the workspace yet." />
          ) : (
            <div className="space-y-3">
              {recentAgentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
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

        <div className="space-y-6">
          <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Governance Space</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                  Human review backlog for agent-originated market submissions.
                </p>
              </div>
              <Badge variant={selectedReviewStatus === 'rejected' ? 'secondary' : 'warning'}>
                {visibleReviews.length}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedReviewStatus === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedReviewStatus('all')}
              >
                All reviews
              </Button>
              <Button
                variant={selectedReviewStatus === 'pending' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedReviewStatus('pending')}
              >
                Pending Review
              </Button>
              <Button
                variant={selectedReviewStatus === 'rejected' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelectedReviewStatus('rejected')}
              >
                Rejected Review
              </Button>
            </div>

            {reviewsQuery.isLoading && visibleReviews.length === 0 ? (
              <SectionNotice message="Loading governance queue..." />
            ) : visibleReviews.length === 0 ? (
              <SectionNotice
                message={
                  selectedReviewStatus === 'rejected'
                    ? 'No rejected submissions are visible right now.'
                    : selectedReviewStatus === 'all'
                      ? 'No review items are visible right now.'
                      : 'No submissions are waiting for governance review.'
                }
              />
            ) : (
              <div className="space-y-2">
                {visibleReviews.slice(0, 4).map((item) => (
                  <div key={`${item.resource_kind}-${item.resource_id}`} className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-[#E8E8EC]">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                          {item.resource_kind} · submitted by {item.created_by_actor_id ?? 'unknown-agent'}
                        </p>
                      </div>
                      {item.publication_status === 'pending_review' ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={actionKey === `reject:${item.resource_kind}:${item.resource_id}`}
                            onClick={() => handleRejectReview(item.resource_kind, item.resource_id)}
                            leftIcon={
                              actionKey !== `reject:${item.resource_kind}:${item.resource_id}`
                                ? <XCircle className="h-4 w-4" />
                                : undefined
                            }
                          >
                            Reject {item.title}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={actionKey === `approve:${item.resource_kind}:${item.resource_id}`}
                            onClick={() => handleApproveReview(item.resource_kind, item.resource_id)}
                            leftIcon={
                              actionKey !== `approve:${item.resource_kind}:${item.resource_id}`
                                ? <CheckCircle2 className="h-4 w-4" />
                                : undefined
                            }
                          >
                            Approve {item.title}
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="secondary">{item.publication_status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

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

            {agentsQuery.isLoading && agents.length === 0 ? (
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
                              {token.display_name ?? token.displayName ?? token.id}
                            </Badge>
                          ))}
                          <Badge variant="secondary">
                            {agentEventCounts[agent.id] ?? 0} recent event{(agentEventCounts[agent.id] ?? 0) === 1 ? '' : 's'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>{agent.status}</Badge>
                        <Button
                          variant={selectedAgentId === agent.id ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setSelectedAgentId(agent.id)}
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

          <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Market Inventory</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                  Published assets and skills currently visible to the agent ecosystem.
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{publishedAssets.length} assets</Badge>
                <Badge variant="secondary">{publishedSkills.length} skills</Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InventoryCard
                icon={<Boxes className="h-4 w-4" />}
                title="Published assets"
                items={publishedAssets.slice(0, 3).map((item) => item.display_name)}
              />
              <InventoryCard
                icon={<Wrench className="h-4 w-4" />}
                title="Published skills"
                items={publishedSkills.slice(0, 3).map((item) => item.name)}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white/75 px-4 py-3 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/65">
      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-300">
        {icon}
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-[#E8E8EC]">{value}</p>
    </div>
  );
}

function SectionNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-4 text-sm text-gray-600 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55 dark:text-[#9CA3AF]">
      {message}
    </div>
  );
}

function InventoryCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-[#E8E8EC]">
        {icon}
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">Nothing published yet.</p>
        ) : (
          items.map((item) => (
            <p key={item} className="text-sm text-gray-600 dark:text-[#9CA3AF]">
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

export default function SpacesPage() {
  return (
    <ManagementRouteGuard>
      <Layout>
        <SpacesContent />
      </Layout>
    </ManagementRouteGuard>
  );
}
