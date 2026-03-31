'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { CheckCircle2, Clock3, RefreshCw, ShieldAlert, ShieldCheck, XCircle, Heart, Sparkles, FileText, Play, Lock } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { useReviews, useApproveReview, useRejectReview } from '@/domains/review';
import { ApiError } from '@/lib/api-client';
import { ManagementSessionExpiredAlert, useManagementPageSessionRecovery } from '@/lib/management-session-recovery';
import type { ReviewQueueItem } from '@/domains/review';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';

export default function ReviewsPage() {
  return (
    <Layout>
      <ReviewsContent />
    </Layout>
  );
}

function ReviewsContent() {
  const t = useI18n().t;
  // 使用 SWR hooks 替代手动 useEffect
  const { data: reviewsData, isLoading, error: dataError, mutate } = useReviews({
    refreshInterval: 10000, // 10秒自动刷新
  });
  const {
    session,
    loading: gateLoading,
    error: gateError,
    shouldShowSessionExpired,
    clearSessionExpired,
    consumeUnauthorized,
  } = useManagementPageSessionRecovery(dataError);
  
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  
  // 本地 UI 状态
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const items = reviewsData?.items ?? [];

  const countByKind = useMemo(() => {
    return items.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.resource_kind] = (accumulator[item.resource_kind] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [items]);

  async function handleRefresh() {
    setIsRefreshing(true);
    setRefreshError(null);
    clearSessionExpired();

    try {
      await mutate();
    } catch (refreshFailure) {
      if (consumeUnauthorized(refreshFailure)) {
        return;
      }

      setRefreshError(
        refreshFailure instanceof Error ? refreshFailure.message : 'Failed to refresh reviews'
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleDecision(item: ReviewQueueItem, decision: 'approve' | 'reject') {
    const nextActionKey = `${decision}:${item.resource_kind}:${item.resource_id}`;
    setActionKey(nextActionKey);
    setError(null);
    clearSessionExpired();

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
        setError(decisionError instanceof Error ? decisionError.message : 'Failed to update review item');
      }
    } finally {
      setActionKey(null);
    }
  }

  const getResourceIcon = (kind: string) => {
    switch (kind) {
      case 'task':
        return <FileText className="w-5 h-5" />;
      case 'playbook':
        return <Play className="w-5 h-5" />;
      case 'secret':
        return <Lock className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-[#252540]/80 px-4 py-2 text-sm text-pink-700 dark:text-[#E891C0] border border-pink-100 dark:border-[#3D3D5C]">
            <ShieldAlert className="h-4 w-4" />
            {t('reviews.subtitle')}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{t('reviews.title')}</h1>
            <p className="mt-1 text-gray-600 dark:text-[#9CA3AF]">{t('reviews.description')}</p>
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
          value={items.length.toString()} 
          icon={<ShieldAlert className="w-5 h-5 text-pink-500 dark:text-[#E891C0]" />}
        />
        <MetricCard 
          label={t('reviews.metrics.tasksQueued')} 
          value={(countByKind.task ?? 0).toString()} 
          icon={<FileText className="w-5 h-5 text-blue-500 dark:text-[#6B9AC4]" />}
        />
        <MetricCard 
          label={t('reviews.metrics.playbooksQueued')} 
          value={(countByKind.playbook ?? 0).toString()} 
          icon={<Play className="w-5 h-5 text-purple-500" />}
        />
        <MetricCard 
          label={t('reviews.metrics.secretsCapabilities')} 
          value={((countByKind.secret ?? 0) + (countByKind.capability ?? 0)).toString()} 
          icon={<Lock className="w-5 h-5 text-amber-500" />}
        />
      </div>

      {/* Session Info */}
      <Card className="border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
          <Badge variant="primary">{session?.role ?? t('reviews.reviewer')}</Badge>
          <span className="dark:text-[#E8E8EC]">{session?.email ?? t('common.loading')}</span>
          <span className="text-gray-300 dark:text-[#3D3D5C]">•</span>
          <span>{t('reviews.onlyPending')}</span>
        </div>
      </Card>

      {shouldShowSessionExpired ? (
        <ManagementSessionExpiredAlert message="Your management session has expired. Sign in again to keep reviewing live queue items." />
      ) : null}

      {refreshError ? (
        <Card
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          className="border border-red-100 dark:border-red-900/50 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-400"
        >
          {refreshError}
        </Card>
      ) : null}

      {/* Error */}
      {gateError || error || (!shouldShowSessionExpired && dataError) ? (
        <Card 
          role="alert" 
          aria-live="assertive" 
          aria-atomic="true"
          className="border border-red-100 dark:border-red-900/50 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-400"
        >
          {gateError ?? error ?? (dataError instanceof Error ? dataError.message : 'Failed to load reviews')}
        </Card>
      ) : null}

      {/* Loading */}
      {gateLoading || isLoading ? (
        <Card className="text-gray-600 dark:text-[#9CA3AF] flex items-center gap-3">
          <span className="animate-spin">🌸</span>
          {t('reviews.loading')}
        </Card>
      ) : null}

      {/* Empty State */}
      {!gateLoading && !isLoading && !shouldShowSessionExpired && items.length === 0 ? (
        <Card variant="feature" className="space-y-6 text-center py-12 dark:from-[#252540] dark:to-[#2D2D50] dark:border-[#3D3D5C]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-[#2D4A3D] text-green-600 dark:text-green-400">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{t('reviews.empty.title')}</h2>
            <p className="text-gray-600 dark:text-[#9CA3AF] max-w-md mx-auto">{t('reviews.empty.description')}</p>
          </div>
          <div className="flex justify-center gap-2 text-3xl opacity-30 dark:opacity-20">
            <span className="animate-bounce" style={{ animationDelay: '0s' }}>🌸</span>
            <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
            <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>💕</span>
          </div>
        </Card>
      ) : null}

      {/* Review Items */}
      <div className="grid gap-4">
        {items.map((item, index) => {
          const busy = actionKey !== null;
          const approveKey = `approve:${item.resource_kind}:${item.resource_id}`;
          const rejectKey = `reject:${item.resource_kind}:${item.resource_id}`;

          return (
            <Card 
              key={`${item.resource_kind}:${item.resource_id}`} 
              variant="kawaii" 
              className="space-y-4 dark:from-[#252540] dark:to-[#2D2D50] dark:border-[#3D3D5C] animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Header */}
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning">{item.publication_status}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getResourceIcon(item.resource_kind)}
                      {item.resource_kind}
                    </Badge>
                    {item.created_via_token_id ? (
                      <Badge variant="default">{item.created_via_token_id}</Badge>
                    ) : null}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">{item.title}</h2>
                    <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">Resource ID: {item.resource_id}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    loading={actionKey === rejectKey}
                    disabled={busy}
                    onClick={() => handleDecision(item, 'reject')}
                    className="border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-500" />
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
                </div>
              </div>

              {/* Details */}
              <div className="grid gap-3 md:grid-cols-3">
                <ReviewStat
                  icon={<Heart className="h-4 w-4 text-pink-500 dark:text-[#E891C0]" />}
                  label={t('reviews.item.submittedBy')}
                  value={`${item.created_by_actor_type}:${item.created_by_actor_id}`}
                />
                <ReviewStat
                  icon={<ShieldAlert className="h-4 w-4 text-pink-500 dark:text-[#E891C0]" />}
                  label={t('reviews.item.tokenProvenance')}
                  value={item.created_via_token_id ?? t('reviews.item.createdDirectly')}
                />
                <ReviewStat
                  icon={<Clock3 className="h-4 w-4 text-pink-500 dark:text-[#E891C0]" />}
                  label={t('reviews.item.lastReview')}
                  value={item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : t('reviews.awaitingDecision')}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer decoration */}
      {items.length > 0 && (
        <div className="flex justify-center gap-2 text-2xl opacity-30 dark:opacity-20 pt-4">
          <span className="animate-float">🌸</span>
          <span className="animate-float" style={{ animationDelay: '0.5s' }}>✨</span>
          <span className="animate-float" style={{ animationDelay: '1s' }}>💕</span>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="space-y-2 border border-pink-100 dark:border-[#3D3D5C] bg-white/90 dark:bg-[#252540]/90">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-[#9CA3AF]">{label}</p>
      </div>
      <p className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
    </Card>
  );
}

function ReviewStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-pink-100 dark:border-[#3D3D5C] bg-pink-50/40 dark:bg-[#1A1A2E]/60 p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9CA3AF]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-gray-800 dark:text-[#E8E8EC] break-all">{value}</p>
    </div>
  );
}
