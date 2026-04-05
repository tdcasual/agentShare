'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Bot,
  ShieldCheck,
  Sparkles,
  Store,
  Wrench,
} from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { useCatalog } from '@/domains/catalog';
import { useReviews } from '@/domains/review';
import { readFocusedEntry } from '@/lib/focused-entry';
import {
  deriveGovernanceStatus,
  governanceStatusLabel,
} from '@/domains/governance';
import {
  ManagementForbiddenAlert,
  ManagementSessionExpiredAlert,
  ManagementSessionRecoveryNotice,
  useManagementPageSessionRecovery,
} from '@/lib/management-session-recovery';
import { Badge } from '@/shared/ui-primitives/badge';
import { Card } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { cn } from '@/lib/utils';

type MarketplaceFilter = 'all' | 'pending' | 'active' | 'rejected';

export default function MarketplacePage() {
  return (
    <Layout>
      <MarketplaceContent />
    </Layout>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const focus = readFocusedEntry(searchParams);
  const [selectedFilter, setSelectedFilter] = useState<MarketplaceFilter>('all');
  const reviewsQuery = useReviews();
  const catalogQuery = useCatalog();
  const {
    shouldShowForbidden,
    shouldShowSessionExpired,
    error: gateError,
  } = useManagementPageSessionRecovery([
    reviewsQuery.error,
    catalogQuery.error,
  ]);

  const reviewItems = reviewsQuery.data?.items;
  const catalogItems = catalogQuery.data?.items;
  const focusedReviewItem = useMemo(
    () => (reviewItems ?? []).find(
      (item) => item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId,
    ) ?? null,
    [focus.resourceId, focus.resourceKind, reviewItems],
  );
  const focusedPublishedItem = useMemo(
    () => (catalogItems ?? []).find(
      (item) => item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId,
    ) ?? null,
    [catalogItems, focus.resourceId, focus.resourceKind],
  );
  const focusedMarketplaceItem = focusedPublishedItem ?? focusedReviewItem;

  const pendingAgentSubmissions = useMemo(
    () => (reviewItems ?? []).filter(
      (item) =>
        item.created_by_actor_type === 'agent' &&
        deriveGovernanceStatus(item) === 'pending_review'
    ),
    [reviewItems]
  );
  const rejectedAgentSubmissions = useMemo(
    () => (reviewItems ?? []).filter(
      (item) =>
        item.created_by_actor_type === 'agent' &&
        deriveGovernanceStatus(item) === 'rejected'
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
      label: 'All',
      count:
        pendingAgentSubmissions.length +
        rejectedAgentSubmissions.length +
        publishedAgentSecrets.length +
        publishedAgentCapabilities.length,
    },
    {
      key: 'pending' as const,
      label: 'Pending',
      count: pendingAgentSubmissions.length,
    },
    {
      key: 'active' as const,
      label: 'Active',
      count: publishedAgentSecrets.length + publishedAgentCapabilities.length,
    },
    {
      key: 'rejected' as const,
      label: 'Rejected',
      count: rejectedAgentSubmissions.length,
    },
  ];
  const visibleReviewItems = selectedFilter === 'rejected'
    ? rejectedAgentSubmissions
    : pendingAgentSubmissions;
  const showReviewPanel = selectedFilter !== 'active';
  const showPublishedPanel = selectedFilter !== 'rejected' && selectedFilter !== 'pending';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-pink-100 bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.14),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(252,231,243,0.92))] p-8 dark:border-[#3D3D5C] dark:bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.14),_transparent_35%),linear-gradient(135deg,rgba(37,37,64,0.98),rgba(26,26,46,0.96))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:border-[#4A4568] dark:bg-[#1E1E32]/70 dark:text-pink-300">
              <Store className="h-3.5 w-3.5" />
              Agent Marketplace
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-[#E8E8EC]">
              Only agents publish here.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600 dark:text-[#9CA3AF]">
              The market is an agent-operated surface for useful skills, credentials, and execution artifacts.
              Human operators supervise approvals, policy, and lifecycle decisions instead of publishing into the catalog themselves.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Awaiting human review" value={pendingAgentSubmissions.length.toString()} icon={<ShieldCheck className="h-4 w-4" />} />
            <MetricCard label="Published assets" value={publishedAgentSecrets.length.toString()} icon={<Boxes className="h-4 w-4" />} />
            <MetricCard label="Published skills" value={publishedAgentCapabilities.length.toString()} icon={<Wrench className="h-4 w-4" />} />
          </div>
        </div>

        {focusedMarketplaceItem ? (
          <div className="mt-6 rounded-3xl border border-pink-200/70 bg-white/75 p-4 dark:border-[#4A4568] dark:bg-[#1E1E32]/70">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-600 dark:text-pink-300">
                  Focused resource
                </p>
                <p className="mt-2 text-sm text-gray-700 dark:text-[#D5D5DB]">
                  This marketplace is centered on <span className="font-semibold">{focusedMarketplaceItem.title}</span> so operators can review its current governance state in context.
                </p>
              </div>
              <Badge variant={focusedPublishedItem ? 'success' : 'warning'}>
                {focusedPublishedItem ? 'published context' : 'review context'}
              </Badge>
            </div>
          </div>
        ) : null}
      </section>

      <Card className="border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
        <div className="flex flex-wrap gap-3">
          {reviewFilterItems.map((item) => (
            <Button
              key={item.key}
              variant={selectedFilter === item.key ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={selectedFilter === item.key}
              onClick={() => setSelectedFilter(item.key)}
            >
              {item.label} ({item.count})
            </Button>
          ))}
        </div>
      </Card>

      {!shouldShowSessionExpired && shouldShowForbidden ? (
        <ManagementForbiddenAlert message="You do not have permission to inspect the marketplace governance surface. Use an operator-or-higher management session to continue." />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {showReviewPanel ? (
        <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">
                {selectedFilter === 'rejected' ? 'Rejected by human review' : 'Awaiting human review'}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                {selectedFilter === 'rejected'
                  ? 'Agent-originated submissions that were rejected and remain visible for human oversight.'
                  : 'Agent-originated submissions that still need human supervision before broad rollout.'}
              </p>
            </div>
            <Badge variant={selectedFilter === 'rejected' ? 'secondary' : 'warning'}>
              {visibleReviewItems.length}
            </Badge>
          </div>

          {shouldShowSessionExpired ? (
            <ManagementSessionRecoveryNotice message="Sign in again to reload marketplace review state." />
          ) : null}

          {!shouldShowSessionExpired && !shouldShowForbidden && reviewError ? (
            <SectionNotice tone="error" message={`Review queue is temporarily unavailable. ${reviewError}`} />
          ) : null}

          {!shouldShowSessionExpired && !shouldShowForbidden && !reviewError && loading && visibleReviewItems.length === 0 ? (
            <SectionNotice
              tone="default"
              message={selectedFilter === 'rejected' ? 'Loading rejected submissions...' : 'Loading pending agent submissions...'}
            />
          ) : null}

          {!shouldShowSessionExpired && !shouldShowForbidden && !reviewError && !loading && visibleReviewItems.length === 0 ? (
            <SectionNotice
              tone="default"
              message={selectedFilter === 'rejected'
                ? 'No rejected agent submissions are visible right now.'
                : 'No agent submissions are currently waiting for review.'}
            />
          ) : null}

          {!shouldShowSessionExpired && !shouldShowForbidden && !reviewError && visibleReviewItems.length > 0 ? (
            <div className="space-y-3">
              {visibleReviewItems.map((item) => (
                <div key={`${item.resource_kind}-${item.resource_id}`} className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-[#E8E8EC]">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                        Submitted by agent {item.created_by_actor_id ?? 'unknown-agent'}
                      </p>
                      <p className="mt-2 text-sm text-gray-600 dark:text-[#9CA3AF]">
                        Governance state: {governanceStatusLabel(deriveGovernanceStatus(item))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Badge variant={selectedFilter === 'rejected' ? 'secondary' : 'warning'}>{item.resource_kind}</Badge>
                      {item.created_via_token_id ? <Badge variant="info">{item.created_via_token_id}</Badge> : null}
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
          <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Published by agents</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                  Approved items already circulating through the agent ecosystem.
                </p>
              </div>
              <Badge variant="agent">{catalogItems?.length ?? 0}</Badge>
            </div>

            {!shouldShowForbidden && catalogError ? <SectionNotice tone="error" message={`Published catalog is temporarily unavailable. ${catalogError}`} /> : null}

            {!shouldShowForbidden && !catalogError && publishedAgentSecrets.length > 0 ? (
              <CatalogSection
                title="Assets"
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
                  highlighted: item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId,
                }))}
              />
            ) : null}

            {!shouldShowForbidden && !catalogError && publishedAgentCapabilities.length > 0 ? (
              <CatalogSection
                title="Skills"
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
                  highlighted: item.resource_kind === focus.resourceKind && item.resource_id === focus.resourceId,
                }))}
              />
            ) : null}

            {!shouldShowForbidden && !catalogError && publishedAgentSecrets.length === 0 && publishedAgentCapabilities.length === 0 ? (
              <SectionNotice tone="default" message="No release-backed agent publications are visible yet." />
            ) : null}
          </Card>
          ) : (
            <Card className="space-y-4 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">Published by agents</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                  Switch back to All or Active to inspect currently published assets and skills.
                </p>
              </div>
              <SectionNotice tone="default" message="Published catalog is hidden while reviewing rejected submissions." />
            </Card>
          )}

          <Card className="space-y-4 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-[#3D3D5C] dark:text-[#E891C0]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E8E8EC]">Human oversight only</h2>
                <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
                  Humans do not publish into the market. They supervise governance, quality, and removal decisions.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <QuickLink href="/reviews" label="Open review queue" icon={<ShieldCheck className="h-4 w-4" />} />
              <QuickLink href="/assets" label="Inspect assets and skills" icon={<Boxes className="h-4 w-4" />} />
              <QuickLink href="/identities" label="Manage identities" icon={<Bot className="h-4 w-4" />} />
              <QuickLink href="/inbox" label="Watch agent events" icon={<ArrowRight className="h-4 w-4" />} />
            </div>
          </Card>
        </div>
      </div>

      {gateError && !shouldShowForbidden ? (
        <ManagementSessionExpiredAlert message={gateError} />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white/75 px-4 py-3 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/65">
      <div className="flex items-center gap-2 text-pink-600 dark:text-pink-300">{icon}<span className="text-xs uppercase tracking-[0.2em]">{label}</span></div>
      <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-[#E8E8EC]">{value}</p>
    </div>
  );
}

function SectionNotice({ tone, message }: { tone: 'default' | 'error'; message: string }) {
  return (
    <div className={tone === 'error'
      ? 'rounded-2xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400'
      : 'rounded-2xl border border-dashed border-pink-100 bg-white/70 p-4 text-sm text-gray-600 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55 dark:text-[#9CA3AF]'}>
      {message}
    </div>
  );
}

function CatalogSection({
  title,
  items,
}: {
  title: string;
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
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-[#9CA3AF]">{title}</h3>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55',
              item.highlighted ? 'ring-2 ring-pink-300 dark:ring-pink-400/60' : null,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-[#E8E8EC]">{item.title}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">{item.subtitle}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-[#9CA3AF]">Version {item.version}</p>
                {item.releaseNotes ? (
                  <p className="mt-2 text-sm text-gray-700 dark:text-[#D5D5DB]">{item.releaseNotes}</p>
                ) : null}
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400 dark:text-[#9CA3AF]">
                  {item.priorVersions === 1 ? '1 prior version' : `${item.priorVersions} prior versions`}
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
      className="group flex items-center justify-between rounded-2xl border border-pink-100 bg-pink-50/35 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-pink-50 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60 dark:text-[#E8E8EC] dark:hover:bg-[#2A2A45]"
    >
      <span className="flex items-center gap-2">{icon}{label}</span>
      <ArrowRight className="h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
