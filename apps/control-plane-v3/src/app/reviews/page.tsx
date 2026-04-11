'use client';

import { useMemo, useState, memo } from 'react';
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
import { deriveGovernanceStatus, governanceStatusLabel } from '@/domains/governance';
import { Layout } from '@/interfaces/human/layout';
import { useReviews, useApproveReview, useRejectReview } from '@/domains/review';
import { ApiError } from '@/lib/api-client';
import { readFocusedEntry } from '@/lib/focused-entry';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import type { ReviewQueueItem } from '@/domains/review';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { cn } from '@/lib/utils';

export default function ReviewsPage() {
  return (
    <Layout>
      <ReviewsContent />
    </Layout>
  );
}

const ReviewsContent = memo(function ReviewsContent() {
  const t = useI18n().t;
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  // 使用 SWR hooks 替代手动 useEffect
  const {
    data: reviewsData,
    isLoading,
    error: dataError,
    mutate,
  } = useReviews({
    refreshInterval: 10000, // 10秒自动刷新
  });
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
  const reviewItems = items ?? [];

  const countByKind = useMemo(() => {
    return (items ?? []).reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.resource_kind] = (accumulator[item.resource_kind] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [items]);
  const agentSubmittedCount = reviewItems.filter(
    (item) => item.created_by_actor_type === 'agent'
  ).length;
  const humanSubmittedCount = reviewItems.filter(
    (item) => item.created_by_actor_type === 'human'
  ).length;
  const tokenOriginatedCount = reviewItems.filter((item) =>
    Boolean(item.created_via_token_id)
  ).length;
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

  async function handleDecision(item: ReviewQueueItem, decision: 'approve' | 'reject') {
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
  }

  const getResourceIcon = (kind: string) => {
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
  };

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
          label={t('reviews.metrics.pendingItems')}
          value={reviewItems.length.toString()}
          icon={
            <ShieldAlert className="h-5 w-5 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
          }
        />
        <MetricCard
          label={t('reviews.metrics.tasksQueued')}
          value={(countByKind.task ?? 0).toString()}
          icon={
            <FileText className="h-5 w-5 text-[var(--kw-sky-text)] dark:text-[var(--kw-dark-sky)]" />
          }
        />
        <MetricCard
          label={t('reviews.metrics.playbooksQueued')}
          value={(countByKind.playbook ?? 0).toString()}
          icon={<Play className="h-5 w-5 text-[var(--kw-purple-text)]" />}
        />
        <MetricCard
          label={t('reviews.metrics.secretsCapabilities')}
          value={((countByKind.secret ?? 0) + (countByKind.capability ?? 0)).toString()}
          icon={<Lock className="h-5 w-5 text-[var(--kw-amber-text)]" />}
        />
      </div>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              Governance coverage
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              Human reviewers can inspect which submissions came from agents directly, which were
              token-originated, and which resource lane needs attention first.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            <Badge variant="agent">{agentSubmittedCount} agent submissions</Badge>
            <Badge variant="human">{humanSubmittedCount} human submissions</Badge>
            <Badge variant="secondary">{tokenOriginatedCount} token-originated</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                Submission provenance
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedProvenance === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedProvenance === 'all'}
                  onClick={() => setSelectedProvenance('all')}
                >
                  All submissions
                </Button>
                <Button
                  variant={selectedProvenance === 'agent' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedProvenance === 'agent'}
                  onClick={() => setSelectedProvenance('agent')}
                >
                  Agent submissions
                </Button>
                <Button
                  variant={selectedProvenance === 'human' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedProvenance === 'human'}
                  onClick={() => setSelectedProvenance('human')}
                >
                  Human submissions
                </Button>
                <Button
                  variant={selectedProvenance === 'token' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedProvenance === 'token'}
                  onClick={() => setSelectedProvenance('token')}
                >
                  Token-originated
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                Resource lane
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedKind === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedKind === 'all'}
                  onClick={() => setSelectedKind('all')}
                >
                  All resources
                </Button>
                <Button
                  variant={selectedKind === 'task' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedKind === 'task'}
                  onClick={() => setSelectedKind('task')}
                >
                  Tasks
                </Button>
                <Button
                  variant={selectedKind === 'capability' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedKind === 'capability'}
                  onClick={() => setSelectedKind('capability')}
                >
                  Capabilities
                </Button>
                <Button
                  variant={selectedKind === 'secret' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedKind === 'secret'}
                  onClick={() => setSelectedKind('secret')}
                >
                  Secrets
                </Button>
                <Button
                  variant={selectedKind === 'playbook' ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={selectedKind === 'playbook'}
                  onClick={() => setSelectedKind('playbook')}
                >
                  Playbooks
                </Button>
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

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message={t('reviews.sessionExpired')} />
      ) : null}

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t('reviews.sessionForbidden')} />
      ) : null}

      {refreshError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
        >
          {refreshError}
        </Card>
      ) : null}

      {/* Error */}
      {gateError || error || (!shouldShowSessionExpired && !shouldShowForbidden && dataError) ? (
        <Card
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 border border-[var(--kw-rose-surface)] text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]"
        >
          {gateError ??
            error ??
            (dataError instanceof Error ? dataError.message : t('reviews.errors.loadFailed'))}
        </Card>
      ) : null}

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
            <span className="animate-float" style={{ animationDelay: '0s' }}>
              🌸
            </span>
            <span className="animate-float" style={{ animationDelay: '0.2s' }}>
              ✨
            </span>
            <span className="animate-float" style={{ animationDelay: '0.4s' }}>
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
          No review items match the current provenance and resource filters.
        </Card>
      ) : null}

      {focusedReviewItem ? (
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
              Focused review item
            </p>
            <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {focusedReviewItem.title}
            </h2>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              Resource {focusedReviewItem.resource_kind}:{focusedReviewItem.resource_id}
            </p>
          </div>
        </Card>
      ) : null}

      {/* Review Items */}
      <div className="grid gap-4">
        {visibleItems.map((item, index) => {
          const governanceStatus = deriveGovernanceStatus(item);
          const busy = actionKey !== null;
          const approveKey = `approve:${item.resource_kind}:${item.resource_id}`;
          const rejectKey = `reject:${item.resource_kind}:${item.resource_id}`;

          return (
            <Card
              key={`${item.resource_kind}:${item.resource_id}`}
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
                      {governanceStatusLabel(governanceStatus)}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getResourceIcon(item.resource_kind)}
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
                      Resource ID: {item.resource_id}
                    </p>
                    <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      Submitted by {item.created_by_actor_type ?? 'unknown'}:
                      {item.created_by_actor_id ?? 'unknown'}
                    </p>
                    <p className="mt-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                      Governance state: {governanceStatusLabel(governanceStatus)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {governanceStatus === 'pending_review' ? (
                    <>
                      <Button
                        variant="secondary"
                        loading={actionKey === rejectKey}
                        disabled={busy}
                        onClick={() => handleDecision(item, 'reject')}
                        className="dark:border-[var(--kw-dark-error-surface)]/50 dark:hover:bg-[var(--kw-dark-error-surface)]/20 border-[var(--kw-error)] hover:bg-[var(--kw-rose-surface)]"
                      >
                        <XCircle className="mr-2 h-4 w-4 text-[var(--kw-error)]" />
                        {t('reviews.actions.reject')}
                      </Button>
                      <Button
                        loading={actionKey === approveKey}
                        disabled={busy}
                        onClick={() => handleDecision(item, 'approve')}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t('reviews.actions.approve')}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Details */}
              <div className="grid gap-3 md:grid-cols-3">
                <ReviewStat
                  icon={
                    <Heart className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
                  }
                  label={t('reviews.item.submittedBy')}
                  value={`${item.created_by_actor_type}:${item.created_by_actor_id}`}
                />
                <ReviewStat
                  icon={
                    <ShieldAlert className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
                  }
                  label={t('reviews.item.tokenProvenance')}
                  value={item.created_via_token_id ?? t('reviews.item.createdDirectly')}
                />
                <ReviewStat
                  icon={
                    <Clock3 className="h-4 w-4 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]" />
                  }
                  label={t('reviews.item.lastReview')}
                  value={
                    item.reviewed_at
                      ? new Date(item.reviewed_at).toLocaleString()
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

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-2 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {label}
        </p>
      </div>
      <p className="text-3xl font-bold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {value}
      </p>
    </Card>
  );
}

function ReviewStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[var(--kw-primary-50)]/40 dark:bg-[var(--kw-dark-bg)]/60 rounded-2xl border border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
      <div className="flex items-center gap-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-all text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
        {value}
      </p>
    </div>
  );
}
