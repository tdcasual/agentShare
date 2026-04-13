'use client';

import { useMemo, useState, memo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Heart,
  Sparkles,
  FileText,
  Play,
  Lock,
} from 'lucide-react';
import {
  deriveGovernanceStatus,
  governanceStatusTranslationKey,
} from '@/domains/governance';
import { Layout } from '@/interfaces/human/layout';
import { useReviews, useApproveReview, useRejectReview } from '@/domains/review';
import { ApiError } from '@/lib/api-client';
import { readFocusedEntry } from '@/lib/focused-entry';
import {
  ManagementPageAlerts,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import type { ReviewQueueItem } from '@/domains/review';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { MetricCard } from '@/shared/ui-primitives/metric';
import { FilterButton } from '@/shared/ui-primitives/filter-button';
import { StatDisplay } from '@/shared/ui-primitives/stat-display';
import { cn } from '@/lib/utils';

export default function ReviewsPage() {
  return (
    <Layout>
      <ReviewsContent />
    </Layout>
  );
}

const REVIEWS_POLLING_CONFIG = { refreshInterval: 10_000 };

const ReviewsContent = memo(function ReviewsContent() {
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  // 使用 SWR hooks 替代手动 useEffect
  const {
    data: reviewsData,
    isLoading,
    error: dataError,
    mutate,
  } = useReviews(REVIEWS_POLLING_CONFIG);
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowForbidden,
    shouldShowSessionExpired,
    clearAllAuthErrors,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(dataError);

  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();

  // 本地 UI 状态
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProvenance, setSelectedProvenance] = useState<'all' | 'agent' | 'human' | 'token'>(
    'all'
  );
  const [selectedKind, setSelectedKind] = useState<
    'all' | 'task' | 'playbook' | 'secret' | 'capability'
  >(() =>
    focus.resourceKind === 'task' ||
    focus.resourceKind === 'playbook' ||
    focus.resourceKind === 'secret' ||
    focus.resourceKind === 'capability'
      ? focus.resourceKind
      : 'all'
  );

  const items = reviewsData?.items;
  const reviewItems = useMemo(() => items ?? [], [items]);

  const countByKind = useMemo(() => {
    return (items ?? []).reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.resource_kind] = (accumulator[item.resource_kind] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [items]);
  const agentSubmittedCount = useMemo(
    () => reviewItems.filter((item) => item.created_by_actor_type === 'agent').length,
    [reviewItems]
  );
  const humanSubmittedCount = useMemo(
    () => reviewItems.filter((item) => item.created_by_actor_type === 'human').length,
    [reviewItems]
  );
  const tokenOriginatedCount = useMemo(
    () => reviewItems.filter((item) => Boolean(item.created_via_token_id)).length,
    [reviewItems]
  );
  const visibleItems = useMemo(
    () =>
      (items ?? []).filter((item) => {
        if (selectedProvenance === 'agent' && item.created_by_actor_type !== 'agent') {
          return false;
        }
        if (selectedProvenance === 'human' && item.created_by_actor_type !== 'human') {
          return false;
        }
        if (selectedProvenance === 'token' && !item.created_via_token_id) {
          return false;
        }
        if (selectedKind !== 'all' && item.resource_kind !== selectedKind) {
          return false;
        }
        return true;
      }),
    [items, selectedKind, selectedProvenance]
  );
  const focusedReviewItem = useMemo(
    () =>
      visibleItems.find(
        (item) => item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId
      ) ?? null,
    [focus.resourceId, focus.resourceKind, visibleItems]
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError(null);
    clearAllAuthErrors();

    try {
      await mutate();
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }

      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : t('reviews.refreshFailed')
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  const handleDecision = useCallback(
    async (item: ReviewQueueItem, decision: 'approve' | 'reject') => {
      const nextActionKey = `${decision}:${item.resource_kind}:${item.resource_id}`;
      setActionKey(nextActionKey);
      setError(null);
      clearAllAuthErrors();

      try {
        if (decision === 'approve') {
          await approveReview(item.resource_kind, item.resource_id);
        } else {
          await rejectReview(item.resource_kind, item.resource_id, { reason: '' });
        }
      } catch (decisionError) {
        if (consumeUnauthorized(decisionError)) {
          return;
        }

        if (decisionError instanceof ApiError) {
          setError(decisionError.detail);
        } else {
          setError(
            decisionError instanceof Error ? decisionError.message : t('reviews.errors.updateFailed')
          );
        }
      } finally {
        setActionKey(null);
      }
    },
    [approveReview, rejectReview, clearAllAuthErrors, consumeUnauthorized, t]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="dark:bg-[var(--kw-dark-surface)]/80 inline-flex items-center gap-2 rounded-full border border-[var(--kw-border)] bg-white/80 px-4 py-2 text-sm text-[var(--kw-primary-600)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
            <ShieldAlert className="h-4 w-4" />
            {t('reviews.subtitle')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('reviews.title')}
            </h1>
            <p className="mt-1 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('reviews.description')}
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={handleRefresh} loading={isRefreshing}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('reviews.actions.refreshQueue')}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          variant="review"
          label={t('reviews.metrics.pendingItems')}
          value={reviewItems.length.toString()}
          icon={
            <ShieldAlert className="h-5 w-5 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
          }
        />
        <MetricCard
          variant="review"
          label={t('reviews.metrics.tasksQueued')}
          value={(countByKind.task ?? 0).toString()}
          icon={
            <FileText className="h-5 w-5 text-[var(--kw-sky-text)] dark:text-[var(--kw-dark-sky)]" />
          }
        />
        <MetricCard
          variant="review"
          label={t('reviews.metrics.playbooksQueued')}
          value={(countByKind.playbook ?? 0).toString()}
          icon={<Play className="h-5 w-5 text-[var(--kw-purple-text)]" />}
        />
        <MetricCard
          variant="review"
          label={t('reviews.metrics.secretsCapabilities')}
          value={((countByKind.secret ?? 0) + (countByKind.capability ?? 0)).toString()}
          icon={<Lock className="h-5 w-5 text-[var(--kw-amber-text)]" />}
        />
      </div>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('reviews.filters.title')}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('reviews.filters.description')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            <Badge variant="agent">{t('reviews.filters.agentSubmissions', { count: agentSubmittedCount })}</Badge>
            <Badge variant="human">{t('reviews.filters.humanSubmissions', { count: humanSubmittedCount })}</Badge>
            <Badge variant="secondary">{t('reviews.filters.tokenOriginated', { count: tokenOriginatedCount })}</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {t('reviews.filters.provenance')}
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  value="all"
                  active={selectedProvenance === 'all'}
                  onSelect={setSelectedProvenance}
                  label={t('reviews.filters.allSubmissions')}
                />
                <FilterButton
                  value="agent"
                  active={selectedProvenance === 'agent'}
                  onSelect={setSelectedProvenance}
                  label={t('reviews.filters.agentOnly')}
                />
                <FilterButton
                  value="human"
                  active={selectedProvenance === 'human'}
                  onSelect={setSelectedProvenance}
                  label={t('reviews.filters.humanOnly')}
                />
                <FilterButton
                  value="token"
                  active={selectedProvenance === 'token'}
                  onSelect={setSelectedProvenance}
                  label={t('reviews.filters.tokenOnly')}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {t('reviews.filters.resourceLane')}
              </p>
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  value="all"
                  active={selectedKind === 'all'}
                  onSelect={setSelectedKind}
                  label={t('reviews.filters.allResources')}
                />
                <FilterButton
                  value="task"
                  active={selectedKind === 'task'}
                  onSelect={setSelectedKind}
                  label={t('tasks.title')}
                />
                <FilterButton
                  value="capability"
                  active={selectedKind === 'capability'}
                  onSelect={setSelectedKind}
                  label={t('assets.metrics.capabilities')}
                />
                <FilterButton
                  value="secret"
                  active={selectedKind === 'secret'}
                  onSelect={setSelectedKind}
                  label={t('assets.metrics.secrets')}
                />
                <FilterButton
                  value="playbook"
                  active={selectedKind === 'playbook'}
                  onSelect={setSelectedKind}
                  label={t('navigation.playbooks')}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Session Info */}
      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <Badge variant="primary">{session?.role ?? t('reviews.reviewer')}</Badge>
          <span className="dark:text-[var(--kw-dark-text)]">
            {session?.email ?? t('common.loading')}
          </span>
          <span className="text-[var(--kw-border)] dark:text-[var(--kw-dark-border)]">•</span>
          <span>{t('reviews.onlyPending')}</span>
        </div>
      </Card>

      <ManagementPageAlerts
        shouldShowSessionExpired={shouldShowSessionExpired}
        shouldShowForbidden={shouldShowForbidden}
        refreshError={refreshError}
        gateError={gateError}
        error={error}
        dataError={dataError}
        sessionExpiredMessage={t('reviews.sessionExpired')}
        forbiddenMessage={t('reviews.sessionForbidden')}
        dataErrorMessage={t('reviews.errors.loadFailed')}
      />

      {/* Loading */}
      {gateLoading || isLoading ? (
        <Card className="flex items-center gap-3 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          <span className="animate-spin">🌸</span>
          {t('reviews.loading')}
        </Card>
      ) : null}

      {/* Empty State */}
      {!gateLoading && !isLoading && !shouldShowSessionExpired && reviewItems.length === 0 ? (
        <Card
          variant="feature"
          className="space-y-6 py-12 text-center dark:border-[var(--kw-dark-border)] dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:bg-[var(--kw-dark-green-accent-surface)] dark:text-[var(--kw-dark-mint)]">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('reviews.empty.title')}
            </h2>
            <p className="mx-auto max-w-md text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('reviews.empty.description')}
            </p>
          </div>
          <div className="flex justify-center gap-2 text-3xl opacity-30 dark:opacity-20">
            <span aria-hidden="true" className="animate-float" style={{ animationDelay: '0s' }}>
              🌸
            </span>
            <span aria-hidden="true" className="animate-float" style={{ animationDelay: '0.2s' }}>
              ✨
            </span>
            <span aria-hidden="true" className="animate-float" style={{ animationDelay: '0.4s' }}>
              💕
            </span>
          </div>
        </Card>
      ) : null}

      {!gateLoading &&
      !isLoading &&
      !shouldShowSessionExpired &&
      reviewItems.length > 0 &&
      visibleItems.length === 0 ? (
        <Card className="dark:bg-[var(--kw-dark-surface)]/80 border border-dashed border-[var(--kw-border)] bg-white/80 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
          {t('reviews.noMatches')}
        </Card>
      ) : null}

      {focusedReviewItem ? (
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              {t('reviews.focusedItem')}
            </p>
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {focusedReviewItem.title}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('reviews.item.resourceId', {
                id: `${focusedReviewItem.resource_kind}:${focusedReviewItem.resource_id}`,
              })}
            </p>
          </div>
        </Card>
      ) : null}

      {/* Review Items */}
      <div className="grid gap-4" role="list">
        {visibleItems.map((item, index) => {
          const governanceStatus = deriveGovernanceStatus(item);
          const busy = actionKey !== null;

          return (
            <Card
              key={`${item.resource_kind}:${item.resource_id}`}
              role="listitem"
              data-testid={`review-card-${item.resource_kind}-${item.resource_id}`}
              data-focus-state={
                item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId
                  ? 'focused'
                  : 'default'
              }
              variant="kawaii"
              className={cn(
                'animate-slide-up space-y-4 dark:border-[var(--kw-dark-border)] dark:from-[var(--kw-dark-surface)] dark:to-[var(--kw-dark-surface-alt)]',
                item.resource_kind === focus.resourceKind &&
                  item.resource_id === focus.resourceId &&
                  'ring-[var(--kw-primary-400)]/20 border-[var(--kw-primary-400)] ring-1 dark:border-[var(--kw-primary-400)]'
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Header */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        governanceStatus === 'rejected'
                          ? 'error'
                          : governanceStatus === 'pending_review'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {t(governanceStatusTranslationKey(governanceStatus))}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <ResourceIcon kind={item.resource_kind} />
                      {item.resource_kind}
                    </Badge>
                    {item.created_via_token_id ? (
                      <Badge variant="default">{item.created_via_token_id}</Badge>
                    ) : null}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                      {item.title}
                    </h2>
                    <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      {t('reviews.item.resourceId', { id: item.resource_id })}
                    </p>
                    <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      {t('reviews.item.submittedByLine', {
                        actorType: item.created_by_actor_type ?? t('common.unknown'),
                        actorId: item.created_by_actor_id ?? t('common.unknown'),
                      })}
                    </p>
                    <p className="mt-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      {t('reviews.item.governanceStateLine', {
                        state: t(governanceStatusTranslationKey(governanceStatus)),
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {governanceStatus === 'pending_review' ? (
                    <ReviewDecisionButtons
                      item={item}
                      actionKey={actionKey}
                      busy={busy}
                      onDecision={handleDecision}
                      t={t}
                    />
                  ) : null}
                </div>
              </div>

              {/* Details */}
              <div className="grid gap-3 md:grid-cols-3">
                <StatDisplay
                  icon={
                    <Heart className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
                  }
                  label={t('reviews.item.submittedBy')}
                  value={`${item.created_by_actor_type}:${item.created_by_actor_id}`}
                />
                <StatDisplay
                  icon={
                    <ShieldAlert className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
                  }
                  label={t('reviews.item.tokenProvenance')}
                  value={item.created_via_token_id ?? t('reviews.item.createdDirectly')}
                />
                <StatDisplay
                  icon={
                    <Clock3 className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
                  }
                  label={t('reviews.item.lastReview')}
                  value={
                    item.reviewed_at
                      ? new Date(item.reviewed_at).toLocaleString(locale)
                      : t('reviews.awaitingDecision')
                  }
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer decoration */}
      {reviewItems.length > 0 && (
        <div className="flex justify-center gap-2 pt-4 text-2xl opacity-30 dark:opacity-20">
          <span className="animate-float">🌸</span>
          <span className="animate-float" style={{ animationDelay: '0.5s' }}>
            ✨
          </span>
          <span className="animate-float" style={{ animationDelay: '1s' }}>
            💕
          </span>
        </div>
      )}
    </div>
  );
});



function ResourceIcon({ kind }: { kind: string }) {
  switch (kind) {
    case 'task':
      return <FileText className="h-5 w-5" />;
    case 'playbook':
      return <Play className="h-5 w-5" />;
    case 'secret':
      return <Lock className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
}

function ReviewDecisionButtons({
  item,
  actionKey,
  busy,
  onDecision,
  t,
}: {
  item: ReviewQueueItem;
  actionKey: string | null;
  busy: boolean;
  onDecision: (item: ReviewQueueItem, decision: 'approve' | 'reject') => void;
  t: (key: string) => string;
}) {
  const approveKey = `approve:${item.resource_kind}:${item.resource_id}`;
  const rejectKey = `reject:${item.resource_kind}:${item.resource_id}`;

  const handleApprove = useCallback(() => {
    onDecision(item, 'approve');
  }, [onDecision, item]);

  const handleReject = useCallback(() => {
    onDecision(item, 'reject');
  }, [onDecision, item]);

  return (
    <>
      <Button
        variant="secondary"
        loading={actionKey === rejectKey}
        disabled={busy}
        onClick={handleReject}
        className="dark:border-[var(--kw-dark-error-surface)]/50 dark:hover:bg-[var(--kw-dark-error-surface)]/20 border-[var(--kw-error)] hover:bg-[var(--kw-rose-surface)]"
      >
        <XCircle className="mr-2 h-4 w-4 text-[var(--kw-error)]" />
        {t('reviews.actions.reject')}
      </Button>
      <Button loading={actionKey === approveKey} disabled={busy} onClick={handleApprove}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {t('reviews.actions.approve')}
      </Button>
    </>
  );
}
