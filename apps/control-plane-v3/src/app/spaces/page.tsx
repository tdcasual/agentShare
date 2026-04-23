'use client';

/**
 * Spaces Page - 空间管理页面
 *
 * 当前定位：
 * - viewer/operator 至少可以稳定读取基础空间列表、成员与时间线。
 * - admin 额外看到 events、reviews、identity、inventory 等运营面板。
 * - admin-only 查询会按角色暂停并隐藏，不再把整个页面拖成结构性 403。
 */

import { useMemo, useState } from 'react';
import { Bot, ShieldCheck, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { ManagementRouteGuard } from '@/components/route-guard';
import { useEvents } from '@/domains/event';
import { useCapabilities, useSecrets } from '@/domains/governance';
import { useAccessTokens, useOpenClawAgents, type AccessToken } from '@/domains/identity';
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
import { useGlobalSession } from '@/lib/session-state';
import { Badge } from '@/shared/ui-primitives/badge';

import { Card } from '@/shared/ui-primitives/card';
import { OperationsFeed } from './operations-feed';
import { GovernancePanel } from './governance-panel';
import { IdentityPanel } from './identity-panel';
import { SpacesList } from './spaces-list';
import { MarketInventoryPanel } from './components';
import { MetricCard } from '@/shared/ui-primitives/metric';
import { useI18n } from '@/components/i18n-provider';

function SpacesContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const globalSession = useGlobalSession();
  const sessionRole = globalSession.state === 'authenticated' ? globalSession.role ?? null : null;
  const role = isValidRole(sessionRole ?? '') ? sessionRole : null;
  const canManageSpaces = hasRequiredRole(role, 'operator');
  const canViewAdminPanels = hasRequiredRole(role, 'admin');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    () => focus.agentId ?? null
  );
  const [selectedEventType, setSelectedEventType] = useState<'all' | 'completed' | 'failed'>('all');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<'all' | 'pending' | 'rejected'>(
    'pending'
  );
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  // 空间管理状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const { create, isCreating } = useCreateSpace();
  const { addMember, isAdding } = useAddSpaceMember(activeSpaceId || '', {
    agentId: focus.agentId ?? null,
  });
  const eventsQuery = useEvents({ isPaused: () => !canViewAdminPanels });
  const reviewsQuery = useReviews({ isPaused: () => !canViewAdminPanels });
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  const agentsQuery = useOpenClawAgents({ isPaused: () => !canViewAdminPanels });
  const accessTokensQuery = useAccessTokens({ isPaused: () => !canViewAdminPanels });
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
    accessTokensQuery.error,
    spacesQuery.error,
    secretsQuery.error,
    capabilitiesQuery.error,
  ]);

  const events = eventsQuery.events;
  const reviewItems = reviewsQuery.data?.items;
  const agents = agentsQuery.data?.items ?? [];
  const accessTokensByAgentId = useMemo(
    () =>
      (accessTokensQuery.data?.items ?? []).reduce<Record<string, AccessToken[]>>(
        (groups, token) => {
          if (token.subjectType !== 'openclaw_agent') {
            return groups;
          }
          groups[token.subjectId] = [...(groups[token.subjectId] ?? []), token];
          return groups;
        },
        {}
      ),
    [accessTokensQuery.data]
  );
  const secrets = secretsQuery.data?.items ?? [];
  const capabilities = capabilitiesQuery.data?.items ?? [];
  const reviewItemList = useMemo(() => reviewItems ?? [], [reviewItems]);
  const persistedSpaces = useMemo(() => spacesQuery.spaces ?? [], [spacesQuery.spaces]);

  const pendingReviews = reviewItemList.filter(
    (item) => item.publication_status === 'pending_review'
  );
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
          ? space.members.some(
              (member) => member.member_type === 'agent' && member.member_id === focus.agentId
            )
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
      setActionNotice(
        t('spaces.notices.approvedReview', { title: reviewedItem?.title ?? resourceId })
      );
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }
      setActionError(
        error instanceof Error ? error.message : t('spaces.errors.approveReviewFailed')
      );
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
      setActionNotice(
        t('spaces.notices.rejectedReview', { title: reviewedItem?.title ?? resourceId })
      );
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }
      setActionError(
        error instanceof Error ? error.message : t('spaces.errors.rejectReviewFailed')
      );
    } finally {
      setActionKey(null);
    }
  }

  async function handleAddMember(
    spaceId: string,
    input: { memberType: 'agent' | 'human'; memberId: string; role: string }
  ) {
    if (!canManageSpaces) {
      return;
    }

    setActiveSpaceId(spaceId);
    setActionError(null);
    setActionNotice(null);
    clearAllAuthErrors();

    try {
      await addMember(input);
      setActionNotice(
        t('spaces.notices.addedMember', {
          memberType: input.memberType,
          memberId: input.memberId,
        })
      );
    } catch (error) {
      if (consumeUnauthorized(error)) {
        return;
      }
      setActionError(error instanceof Error ? error.message : t('spaces.errors.addMemberFailed'));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Hero Section */}
      {canViewAdminPanels ? (
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--kw-border)] bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.14),_transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,247,237,0.94))] p-4 sm:p-6 lg:p-8 dark:border-[var(--kw-dark-border)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.12),_transparent_35%),linear-gradient(135deg,rgba(37,37,64,0.98),rgba(26,26,46,0.96))]">
          <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="dark:bg-[var(--kw-dark-surface-alt)]/70 inline-flex items-center gap-2 rounded-full border border-[var(--kw-orange-surface)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-orange-text)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-warning)]">
                <Sparkles className="h-3.5 w-3.5" />
                {t('spaces.hero.badge')}
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--kw-text)]">
                {t('spaces.hero.title')}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--kw-text-muted)]">
                {t('spaces.hero.description')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                variant="space"
                label={t('spaces.hero.metrics.recentEvents')}
                value={events.length.toString()}
                icon={<Sparkles className="h-4 w-4" />}
              />
              <MetricCard
                variant="space"
                label={t('spaces.hero.metrics.pendingReviews')}
                value={pendingReviews.length.toString()}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <MetricCard
                variant="space"
                label={t('spaces.hero.metrics.activeAgents')}
                value={activeAgents.length.toString()}
                icon={<Bot className="h-4 w-4" />}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* Focused Context */}
      {focusedAgent || focusedEvent || focusedSpace ? (
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              {t('spaces.focusedContext.title')}
            </p>
            {focusedSpace ? (
              <p className="text-sm font-medium text-[var(--kw-text)]">
                {t('spaces.focusedContext.persistedSpace', { name: focusedSpace.name })}
              </p>
            ) : null}
            {focusedAgent ? (
              <h2 className="text-lg font-semibold text-[var(--kw-text)]">{focusedAgent.name}</h2>
            ) : null}
            {focusedEvent ? (
              <p className="text-sm text-[var(--kw-text-muted)]">
                {t('spaces.focusedContext.eventSummary', { summary: focusedEvent.summary })}
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Alerts */}
      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={t('spaces.sessionExpired')} />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t('spaces.sessionForbidden')} />
      ) : null}

      {actionNotice ? (
        <Card
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="bg-[var(--kw-green-surface)]/80 dark:border-[var(--kw-dark-success-surface)]/50 dark:bg-[var(--kw-dark-success-surface)]/20 border border-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:text-[var(--kw-dark-mint)]"
        >
          {actionNotice}
        </Card>
      ) : null}

      {!shouldShowSessionExpired && !shouldShowForbidden && (actionError || gateError) ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
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
        <div className="grid gap-3 sm:gap-4 lg:gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
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
              accessTokensByAgentId={accessTokensByAgentId}
              eventCounts={agentEventCounts}
              isLoading={agentsQuery.isLoading || accessTokensQuery.isLoading}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
            />

            {/* Market Inventory */}
            <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-3 sm:space-y-4 lg:space-y-5 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--kw-text)]">
                    {t('spaces.marketInventory.title')}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                    {t('spaces.marketInventory.description')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    {t('spaces.marketInventory.assetsCount', { count: publishedAssets.length })}
                  </Badge>
                  <Badge variant="secondary">
                    {t('spaces.marketInventory.skillsCount', { count: publishedSkills.length })}
                  </Badge>
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
              setActionNotice(t('spaces.notices.createdWorkspace', { name: input.name }));
              await spacesQuery.refresh();
            } catch (error) {
              if (consumeUnauthorized(error)) {
                return;
              }
              setActionError(
                error instanceof Error ? error.message : t('spaces.errors.createWorkspaceFailed')
              );
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
