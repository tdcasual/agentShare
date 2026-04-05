'use client';

/**
 * Spaces Page - 空间管理页面
 * 
 * ⚠️ 已知权限边界偏移（H2）:
 * - 后端 spaces API: viewer/operator 可读
 * - 但页面耦合了 admin-only 面板：events, reviews, agents, secrets, capabilities
 * 
 * 当前行为:
 * - 前端路由角色: viewer（基础空间视图）
 * - admin-only 面板根据角色降级隐藏
 * 
 * 建议解决方案（需产品决策）:
 * 1. 拆分页面：基础空间视图（viewer+）+ 管理面板（admin）
 * 2. 保留当前 admin-only 复合页面，viewer/operator 通过其他入口只读空间
 * 3. 条件渲染：根据角色显示/隐藏 admin-only 面板
 * 
 * 当前缓解措施:
 * - 路由设为 viewer，基础空间视图对低权限会话保持可读
 * - admin-only 面板按角色隐藏，并暂停对应查询
 * - 使用 useManagementPageSessionRecovery 处理 401/403
 */

import { useMemo, useState } from 'react';
import { Bot, ShieldCheck, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ManagementRouteGuard } from '@/components/route-guard';
import { useEvents } from '@/domains/event';
import { useCapabilities, useSecrets } from '@/domains/governance';
import { useAgentsWithTokens } from '@/domains/identity';
import { useApproveReview, useRejectReview, useReviews } from '@/domains/review';
import { useSpaces, useCreateSpace, useAddSpaceMember } from '@/domains/space';
import { CreateSpaceModal } from '@/domains/space/components/create-space-modal';
import { Layout } from '@/interfaces/human/layout';
import { readFocusedEntry } from '@/lib/focused-entry';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { hasRequiredRole, isValidRole } from '@/lib/role-system';
import { useManagementSessionGate } from '@/lib/session';
import { Badge } from '@/shared/ui-primitives/badge';

import { Card } from '@/shared/ui-primitives/card';
import { OperationsFeed } from './operations-feed';
import { GovernancePanel } from './governance-panel';
import { IdentityPanel } from './identity-panel';
import { SpacesList } from './spaces-list';
import { MetricCard, MarketInventoryPanel } from './components';

function SpacesContent() {
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const { session } = useManagementSessionGate({ redirectOnMissingSession: false });
  const sessionRole = session?.role ?? null;
  const role = isValidRole(sessionRole ?? '') ? sessionRole : null;
  const canManageSpaces = hasRequiredRole(role, 'operator');
  const canViewAdminPanels = hasRequiredRole(role, 'admin');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => focus.agentId ?? null);
  const [selectedEventType, setSelectedEventType] = useState<'all' | 'completed' | 'failed'>('all');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<'all' | 'pending' | 'rejected'>('pending');
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  // 空间管理状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const { create, isCreating } = useCreateSpace();
  const { addMember, isAdding } = useAddSpaceMember(activeSpaceId || '', { agentId: focus.agentId ?? null });
  const eventsQuery = useEvents({ isPaused: () => !canViewAdminPanels });
  const reviewsQuery = useReviews({ isPaused: () => !canViewAdminPanels });
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  const agentsQuery = useAgentsWithTokens({ isPaused: () => !canViewAdminPanels });
  const spacesQuery = useSpaces({ agentId: focus.agentId ?? null });
  const secretsQuery = useSecrets({ isPaused: () => !canViewAdminPanels });
  const capabilitiesQuery = useCapabilities({ isPaused: () => !canViewAdminPanels });
  const {
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery([
    eventsQuery.error,
    reviewsQuery.error,
    agentsQuery.error,
    spacesQuery.error,
    secretsQuery.error,
    capabilitiesQuery.error,
  ]);

  const events = eventsQuery.events;
  const reviewItems = reviewsQuery.data?.items;
  const agents = agentsQuery.agents;
  const tokensByAgent = agentsQuery.tokensByAgent;
  const secrets = secretsQuery.data?.items ?? [];
  const capabilities = capabilitiesQuery.data?.items ?? [];
  const reviewItemList = useMemo(() => reviewItems ?? [], [reviewItems]);
  const persistedSpaces = useMemo(
    () => spacesQuery.spaces ?? [],
    [spacesQuery.spaces]
  );

  const pendingReviews = reviewItemList.filter((item) => item.publication_status === 'pending_review');
  const rejectedReviews = reviewItemList.filter((item) => item.publication_status === 'rejected');
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
    return reviewItemList ?? [];
  }, [pendingReviews, rejectedReviews, reviewItemList, selectedReviewStatus]);
  const publishedAssets = secrets.filter((item) => item.publication_status === 'active');
  const publishedSkills = capabilities.filter((item) => item.publication_status === 'active');
  const focusedAgent = agents.find((agent) => agent.id === focus.agentId) ?? null;
  const focusedEvent = events.find((event) => event.id === focus.eventId) ?? null;
  const focusedSpace = useMemo(
    () =>
      persistedSpaces.find((space) =>
        focus.agentId
          ? space.members.some((member) => member.member_type === 'agent' && member.member_id === focus.agentId)
          : false
      ) ?? null,
    [focus.agentId, persistedSpaces]
  );

  async function handleApproveReview(resourceKind: string, resourceId: string) {
    const nextActionKey = `approve:${resourceKind}:${resourceId}`;
    const reviewedItem = reviewItemList.find(
      (item) => item.resource_kind === resourceKind && item.resource_id === resourceId
    );
    setActionKey(nextActionKey);
    setActionError(null);
    setActionNotice(null);
    clearAllAuthErrors();

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
    const reviewedItem = reviewItemList.find(
      (item) => item.resource_kind === resourceKind && item.resource_id === resourceId
    );
    setActionKey(nextActionKey);
    setActionError(null);
    setActionNotice(null);
    clearAllAuthErrors();

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

  async function handleAddMember(spaceId: string, input: { memberType: 'agent' | 'human'; memberId: string; role: string }) {
    if (!canManageSpaces) {
      return;
    }

    setActiveSpaceId(spaceId);
    setActionError(null);
    setActionNotice(null);
    clearAllAuthErrors();

    try {
      await addMember(input);
      setActionNotice(`Added ${input.memberType} ${input.memberId} to the workspace.`);
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }
      setActionError(error instanceof Error ? error.message : 'Failed to add member to the workspace');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero Section */}
      {canViewAdminPanels ? (
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
      ) : null}

      {/* Focused Context */}
      {focusedAgent || focusedEvent || focusedSpace ? (
        <Card className="border border-pink-200 bg-pink-50/70 dark:border-pink-500/60 dark:bg-pink-500/10">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
              Focused workspace context
            </p>
            {focusedSpace ? (
              <p className="text-sm font-medium text-gray-900 dark:text-[#E8E8EC]">
                Persisted space: {focusedSpace.name}
              </p>
            ) : null}
            {focusedAgent ? (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E8E8EC]">{focusedAgent.name}</h2>
            ) : null}
            {focusedEvent ? (
              <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">Event summary: {focusedEvent.summary}</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Alerts */}
      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep operating the workspace." />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message="You do not have permission to access some workspace data. Admin-only panels are hidden until a higher-privilege session is available." />
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

      {!shouldShowSessionExpired && !shouldShowForbidden && (actionError || gateError) ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="border border-red-100 bg-red-50/80 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
        >
          {actionError ?? gateError}
        </Card>
      ) : null}

      {/* Spaces List */}
      <SpacesList
        spaces={persistedSpaces}
        isLoading={spacesQuery.isLoading}
        activeSpaceId={activeSpaceId}
        isAdding={isAdding}
        canManageSpaces={canManageSpaces}
        onShowCreateModal={() => setShowCreateModal(true)}
        onAddMember={handleAddMember}
        setActiveSpaceId={setActiveSpaceId}
      />

      {/* Main Content Grid */}
      {canViewAdminPanels ? (
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Operations Feed */}
        <OperationsFeed
          events={recentAgentEvents}
          agents={agents}
          isLoading={eventsQuery.isLoading}
          selectedAgentId={selectedAgentId}
          selectedEventType={selectedEventType}
          onSelectAgent={setSelectedAgentId}
          onSelectEventType={setSelectedEventType}
        />

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Governance Panel */}
          <GovernancePanel
            reviews={visibleReviews}
            isLoading={reviewsQuery.isLoading}
            selectedStatus={selectedReviewStatus}
            actionKey={actionKey}
            onSelectStatus={setSelectedReviewStatus}
            onApprove={handleApproveReview}
            onReject={handleRejectReview}
          />

          {/* Identity Panel */}
          <IdentityPanel
            agents={agents}
            tokensByAgent={tokensByAgent}
            eventCounts={agentEventCounts}
            isLoading={agentsQuery.isLoading}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
          />

          {/* Market Inventory */}
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
            <MarketInventoryPanel 
              data={{
                assets: publishedAssets.slice(0, 3).map((item) => item.display_name),
                skills: publishedSkills.slice(0, 3).map((item) => item.name),
              }} 
            />
          </Card>
        </div>
      </div>
      ) : null}

      {/* Create Space Modal */}
      {canManageSpaces && showCreateModal && (
        <CreateSpaceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (input) => {
            setActionError(null);
            setActionNotice(null);
            clearAllAuthErrors();

            try {
              await create(input);
              setShowCreateModal(false);
              setActionNotice(`Created workspace ${input.name}.`);
              await spacesQuery.refresh();
            } catch (error) {
              if (consumeUnauthorized(error)) {
                return;
              }
              setActionError(error instanceof Error ? error.message : 'Failed to create workspace');
            }
          }}
          isCreating={isCreating}
        />
      )}
    </div>
  );
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
