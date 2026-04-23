'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState, memo, type ReactNode } from 'react';
import { ArrowRight, Boxes, Bot, ShieldCheck, Sparkles, Store, Wrench } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { useCatalog } from '@/domains/catalog';
import { useReviews } from '@/domains/review';
import { readFocusedEntry } from '@/lib/focused-entry';
import { deriveGovernanceStatus, governanceStatusTranslationKey } from '@/domains/governance';
import { useGlobalSession } from '@/lib/session-state';
import {
  ManagementForbiddenAlert,
  ManagementSessionRecoveryNotice,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Badge } from '@/shared/ui-primitives/badge';
import { Card } from '@/shared/ui-primitives/card';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { MetricCard } from '@/shared/ui-primitives/metric';
import { FilterButton } from '@/shared/ui-primitives/filter-button';
import { hasRequiredRole, type ManagementRole } from '@/lib/role-system';

type MarketplaceFilter = 'all' | 'pending' | 'active' | 'rejected';

const QUICK_LINKS: Array<{
  href: string;
  labelKey: string;
  icon: ReactNode;
  requiredRole: ManagementRole;
}> = [
  {
    href: '/reviews',
    labelKey: 'marketplace.quickLinkReviews',
    icon: <ShieldCheck className="h-4 w-4" />,
    requiredRole: 'operator',
  },
  {
    href: '/assets',
    labelKey: 'marketplace.quickLinkAssets',
    icon: <Boxes className="h-4 w-4" />,
    requiredRole: 'admin',
  },
  {
    href: '/identities',
    labelKey: 'marketplace.quickLinkIdentities',
    icon: <Bot className="h-4 w-4" />,
    requiredRole: 'admin',
  },
  {
    href: '/inbox',
    labelKey: 'marketplace.quickLinkInbox',
    icon: <ArrowRight className="h-4 w-4" />,
    requiredRole: 'admin',
  },
];

export default function MarketplacePage() {
  return (
    <Layout>
      <MarketplaceContent />
    </Layout>
  );
}

const MarketplaceContent = memo(function MarketplaceContent() {
  const { t } = useI18n();
  const globalSession = useGlobalSession();
  const session =
    globalSession.state === 'authenticated'
      ? { email: globalSession.email ?? '', role: globalSession.role ?? 'viewer' }
      : null;
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const [selectedFilter, setSelectedFilter] = useState<MarketplaceFilter>('all');
  const reviewsQuery = useReviews();
  const catalogQuery = useCatalog();
  const {
    shouldShowForbidden,
    shouldShowSessionExpired,
    error: gateError,
  } = useManagementPageSessionRecovery([reviewsQuery.error, catalogQuery.error]);

  const reviewItems = reviewsQuery.data?.items;
  const catalogItems = catalogQuery.data?.items;
  const focusedReviewItem = useMemo(
    () =>
      (reviewItems ?? []).find(
        (item) => item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId
      ) ?? null,
    [focus.resourceId, focus.resourceKind, reviewItems]
  );
  const focusedPublishedItem = useMemo(
    () =>
      (catalogItems ?? []).find(
        (item) => item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId
      ) ?? null,
    [catalogItems, focus.resourceId, focus.resourceKind]
  );
  const focusedMarketplaceItem = focusedPublishedItem ?? focusedReviewItem;

  const pendingAgentSubmissions = useMemo(
    () =>
      (reviewItems ?? []).filter(
        (item) =>
          item.created_by_actor_type === 'agent' &&
          deriveGovernanceStatus(item) === 'pending_review'
      ),
    [reviewItems]
  );
  const rejectedAgentSubmissions = useMemo(
    () =>
      (reviewItems ?? []).filter(
        (item) =>
          item.created_by_actor_type === 'agent' && deriveGovernanceStatus(item) === 'rejected'
      ),
    [reviewItems]
  );
  const publishedAgentSecrets = useMemo(
    () => (catalogItems ?? []).filter((item) => item.resource_kind === 'secret'),
    [catalogItems]
  );
  const publishedAgentCapabilities = useMemo(
    () => (catalogItems ?? []).filter((item) => item.resource_kind === 'capability'),
    [catalogItems]
  );

  const loading = reviewsQuery.isLoading || catalogQuery.isLoading;
  const reviewError = reviewsQuery.error instanceof Error ? reviewsQuery.error.message : null;
  const catalogError = catalogQuery.error instanceof Error ? catalogQuery.error.message : null;
  const reviewFilterItems = [
    {
      key: 'all' as const,
      label: t('marketplace.filterAll'),
      count:
        pendingAgentSubmissions.length +
        rejectedAgentSubmissions.length +
        publishedAgentSecrets.length +
        publishedAgentCapabilities.length,
    },
    {
      key: 'pending' as const,
      label: t('marketplace.filterPending'),
      count: pendingAgentSubmissions.length,
    },
    {
      key: 'active' as const,
      label: t('marketplace.filterActive'),
      count: publishedAgentSecrets.length + publishedAgentCapabilities.length,
    },
    {
      key: 'rejected' as const,
      label: t('marketplace.filterRejected'),
      count: rejectedAgentSubmissions.length,
    },
  ];
  const visibleReviewItems =
    selectedFilter === 'rejected' ? rejectedAgentSubmissions : pendingAgentSubmissions;
  const showReviewPanel = selectedFilter !== 'active';
  const showPublishedPanel = selectedFilter !== 'rejected' && selectedFilter !== 'pending';
  const quickLinks = QUICK_LINKS.filter((link) =>
    hasRequiredRole(session?.role, link.requiredRole)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--kw-border)] bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.14),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(252,231,243,0.92))] p-8 dark:border-[var(--kw-dark-border)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.14),_transparent_35%),linear-gradient(135deg,rgba(37,37,64,0.98),rgba(26,26,46,0.96))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="dark:bg-[var(--kw-dark-bg)]/70 inline-flex items-center gap-2 rounded-full border border-[var(--kw-primary-200)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
              <Store className="h-3.5 w-3.5" />
              {t('marketplace.tagline')}
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
              {t('marketplace.headline')}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('marketplace.subtitle')}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              variant="marketplace"
              label={t('marketplace.metricAwaitingReview')}
              value={pendingAgentSubmissions.length.toString()}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <MetricCard
              variant="marketplace"
              label={t('marketplace.metricPublishedAssets')}
              value={publishedAgentSecrets.length.toString()}
              icon={<Boxes className="h-4 w-4" />}
            />
            <MetricCard
              variant="marketplace"
              label={t('marketplace.metricPublishedSkills')}
              value={publishedAgentCapabilities.length.toString()}
              icon={<Wrench className="h-4 w-4" />}
            />
          </div>
        </div>

        {focusedMarketplaceItem ? (
          <div className="border-[var(--kw-primary-200)]/70 dark:bg-[var(--kw-dark-bg)]/70 mt-6 rounded-3xl border bg-white/75 p-4 dark:border-[var(--kw-dark-border)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
                  {t('marketplace.focusedResource')}
                </p>
                <p className="mt-2 text-sm text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('marketplace.focusedDescPrefix')}{' '}
                  <span className="font-semibold">{focusedMarketplaceItem.title}</span>{' '}
                  {t('marketplace.focusedDescSuffix')}
                </p>
              </div>
              <Badge variant={focusedPublishedItem ? 'success' : 'warning'}>
                {focusedPublishedItem
                  ? t('marketplace.contextPublished')
                  : t('marketplace.contextReview')}
              </Badge>
            </div>
          </div>
        ) : null}
      </section>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
        <div className="flex flex-wrap gap-3">
          {reviewFilterItems.map((item) => (
            <FilterButton
              key={item.key}
              value={item.key}
              active={selectedFilter === item.key}
              onSelect={setSelectedFilter}
              label={`${item.label} (${item.count})`}
            />
          ))}
        </div>
      </Card>

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message={t('marketplace.forbiddenMessage')} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {showReviewPanel ? (
          <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-5 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {selectedFilter === 'rejected'
                    ? t('marketplace.rejectedTitle')
                    : t('marketplace.pendingTitle')}
                </h2>
                <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {selectedFilter === 'rejected'
                    ? t('marketplace.rejectedDesc')
                    : t('marketplace.pendingDesc')}
                </p>
              </div>
              <Badge variant={selectedFilter === 'rejected' ? 'secondary' : 'warning'}>
                {visibleReviewItems.length}
              </Badge>
            </div>

            {shouldShowSessionExpired ? (
              <ManagementSessionRecoveryNotice message={t('marketplace.sessionExpiredMessage')} />
            ) : null}

            {!shouldShowSessionExpired && !shouldShowForbidden && reviewError ? (
              <SectionNotice
                tone="error"
                message={`${t('marketplace.reviewQueueErrorPrefix')} ${reviewError}`}
              />
            ) : null}

            {!shouldShowSessionExpired &&
            !shouldShowForbidden &&
            !reviewError &&
            loading &&
            visibleReviewItems.length === 0 ? (
              <SectionNotice
                tone="default"
                message={
                  selectedFilter === 'rejected'
                    ? t('marketplace.loadingRejectedSubmissions')
                    : t('marketplace.loadingPendingSubmissions')
                }
              />
            ) : null}

            {!shouldShowSessionExpired &&
            !shouldShowForbidden &&
            !reviewError &&
            !loading &&
            visibleReviewItems.length === 0 ? (
              <SectionNotice
                tone="default"
                message={
                  selectedFilter === 'rejected'
                    ? t('marketplace.noRejectedSubmissions')
                    : t('marketplace.noPendingSubmissions')
                }
              />
            ) : null}

            {!shouldShowSessionExpired &&
            !shouldShowForbidden &&
            !reviewError &&
            visibleReviewItems.length > 0 ? (
              <div className="space-y-3">
                {visibleReviewItems.map((item) => (
                  <div
                    key={`${item.resource_kind}-${item.resource_id}`}
                    className="bg-[var(--kw-primary-50)]/40 dark:bg-[var(--kw-dark-bg)]/60 rounded-2xl border border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                          {t('marketplace.submittedByAgent')}{' '}
                          {item.created_by_actor_id ?? 'unknown-agent'}
                        </p>
                        <p className="mt-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                          {t('marketplace.governanceState')}:{' '}
                          {t(governanceStatusTranslationKey(deriveGovernanceStatus(item)))}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Badge variant={selectedFilter === 'rejected' ? 'secondary' : 'warning'}>
                          {item.resource_kind}
                        </Badge>
                        {item.created_via_token_id ? (
                          <Badge variant="info">{item.created_via_token_id}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        <div className="space-y-6">
          {showPublishedPanel ? (
            <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-5 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                    {t('marketplace.publishedTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {t('marketplace.publishedDesc')}
                  </p>
                </div>
                <Badge variant="agent">{catalogItems?.length ?? 0}</Badge>
              </div>

              {!shouldShowForbidden && catalogError ? (
                <SectionNotice
                  tone="error"
                  message={`${t('marketplace.catalogErrorPrefix')} ${catalogError}`}
                />
              ) : null}

              {!shouldShowForbidden && !catalogError && publishedAgentSecrets.length > 0 ? (
                <CatalogSection
                  title={t('marketplace.sectionAssets')}
                  t={t}
                  items={publishedAgentSecrets.map((item) => ({
                    id: item.release_id,
                    resourceKind: item.resource_kind,
                    resourceId: item.resource_id,
                    title: item.title,
                    subtitle: item.subtitle ?? '',
                    badge: item.release_status,
                    version: item.version,
                    releaseNotes: item.release_notes ?? null,
                    priorVersions: item.prior_versions,
                    highlighted:
                      item.resource_kind === focus.resourceKind &&
                      item.resource_id === focus.resourceId,
                  }))}
                />
              ) : null}

              {!shouldShowForbidden && !catalogError && publishedAgentCapabilities.length > 0 ? (
                <CatalogSection
                  title={t('marketplace.sectionSkills')}
                  t={t}
                  items={publishedAgentCapabilities.map((item) => ({
                    id: item.release_id,
                    resourceKind: item.resource_kind,
                    resourceId: item.resource_id,
                    title: item.title,
                    subtitle: item.subtitle ?? '',
                    badge: item.release_status,
                    version: item.version,
                    releaseNotes: item.release_notes ?? null,
                    priorVersions: item.prior_versions,
                    highlighted:
                      item.resource_kind === focus.resourceKind &&
                      item.resource_id === focus.resourceId,
                  }))}
                />
              ) : null}

              {!shouldShowForbidden &&
              !catalogError &&
              publishedAgentSecrets.length === 0 &&
              publishedAgentCapabilities.length === 0 ? (
                <SectionNotice tone="default" message={t('marketplace.emptyPublished')} />
              ) : null}
            </Card>
          ) : (
            <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-4 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
              <div>
                <h2 className="text-xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('marketplace.publishedTitle')}
                </h2>
                <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('marketplace.switchHint')}
                </p>
              </div>
              <SectionNotice tone="default" message={t('marketplace.hiddenWhileReviewing')} />
            </Card>
          )}

          <Card className="dark:bg-[var(--kw-dark-surface)]/90 space-y-4 border border-[var(--kw-border)] bg-white/90 dark:border-[var(--kw-dark-border)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('marketplace.oversightTitle')}
                </h2>
                <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('marketplace.oversightDesc')}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickLinks.map((link) => (
                <QuickLink
                  key={link.href}
                  href={link.href}
                  label={t(link.labelKey)}
                  icon={link.icon}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      {gateError && !shouldShowSessionExpired && !shouldShowForbidden ? (
        <SectionNotice tone="error" message={gateError} />
      ) : null}
    </div>
  );
});

function SectionNotice({ tone, message }: { tone: 'default' | 'error'; message: string }) {
  return (
    <div
      className={
        tone === 'error'
          ? 'bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/20 rounded-2xl border border-[var(--kw-rose-surface)] p-4 text-sm text-[var(--kw-rose-text)] dark:text-[var(--kw-error)]'
          : 'dark:bg-[var(--kw-dark-bg)]/55 rounded-2xl border border-dashed border-[var(--kw-border)] bg-white/70 p-4 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]'
      }
    >
      {message}
    </div>
  );
}

function CatalogSection({
  title,
  items,
  t,
}: {
  title: string;
  t: ReturnType<typeof useI18n>['t'];
  items: Array<{
    id: string;
    resourceKind: string;
    resourceId: string;
    title: string;
    subtitle: string;
    badge: string;
    version: number;
    releaseNotes: string | null;
    priorVersions: number;
    highlighted: boolean;
  }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          {title}
        </h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'dark:bg-[var(--kw-dark-bg)]/55 rounded-2xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]',
              item.highlighted
                ? 'dark:ring-[var(--kw-primary-400)]/60 ring-2 ring-[var(--kw-primary-300)]'
                : null
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {item.subtitle}
                </p>
                <p className="mt-2 text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('marketplace.version')} {item.version}
                </p>
                {item.releaseNotes ? (
                  <p className="mt-2 text-sm text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                    {item.releaseNotes}
                  </p>
                ) : null}
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {item.priorVersions === 1
                    ? t('marketplace.priorVersionOne')
                    : `${item.priorVersions} ${t('marketplace.priorVersions')}`}
                </p>
              </div>
              <Badge variant="success">{item.badge}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="bg-[var(--kw-primary-50)]/35 dark:bg-[var(--kw-dark-bg)]/60 group flex items-center justify-between rounded-2xl border border-[var(--kw-border)] px-4 py-3 text-sm text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-primary-50)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <ArrowRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
