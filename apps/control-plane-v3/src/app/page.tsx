'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '../interfaces/human/layout';
import { useEvents, type Event } from '@/domains/event';
import { useAdminAccounts, useAgentsWithTokens } from '@/domains/identity';
import { useReviews } from '@/domains/review';
import { Card } from '../shared/ui-primitives/card';
import { Button } from '../shared/ui-primitives/button';
import { Badge } from '../shared/ui-primitives/badge';
import { resolveAppEntryState, type AppEntryState } from '@/lib/session';
import { useI18n } from '@/components/i18n-provider';
import {
  Users,
  Bot,
  Zap,
  CheckSquare,
  ArrowRight,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function HubPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [entryState, setEntryState] = useState<AppEntryState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const nextState = await resolveAppEntryState();
        if (cancelled) {
          return;
        }
        setEntryState(nextState);
        if (nextState.kind === 'bootstrap_required') {
          router.replace('/setup');
          return;
        }
        if (nextState.kind === 'login_required') {
          router.replace('/login');
          return;
        }
        if (nextState.kind === 'unavailable') {
          setError(nextState.error);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('hub.loadingError'));
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card
          role="alert"
          aria-live="assertive"
          variant="feature"
          className="w-full max-w-lg space-y-4 text-center"
        >
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-pink-500">Control Plane V3</p>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
              {t('hub.unableToOpen')}
            </h1>
            <p className="text-gray-600 dark:text-[#9CA3AF]">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!entryState || entryState.kind !== 'authenticated_ready') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card variant="feature" className="w-full max-w-lg space-y-4 text-center">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-pink-500">Control Plane V3</p>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
              {t('hub.routing')}
            </h1>
            <p className="text-gray-600 dark:text-[#9CA3AF]">{t('hub.checkingStatus')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <HubContent email={entryState.session.email ?? ''} role={entryState.session.role} />
    </Layout>
  );
}

const HubContent = memo(function HubContent({ email, role }: { email: string; role: string }) {
  const { t } = useI18n();
  const { events } = useEvents();
  const adminAccountsQuery = useAdminAccounts();
  const agentsWithTokensQuery = useAgentsWithTokens();
  const reviewsQuery = useReviews();

  const adminAccounts = adminAccountsQuery.data?.items;
  const agents = agentsWithTokensQuery.agents;
  const tokensByAgent = agentsWithTokensQuery.tokensByAgent;
  const adminAccountList = adminAccounts ?? [];
  const pendingReviews = useMemo(
    () =>
      (reviewsQuery.data?.items ?? []).filter(
        (item) => item.publication_status === 'pending_review'
      ),
    [reviewsQuery.data]
  );
  const totalTokens = useMemo(
    () => Object.values(tokensByAgent).reduce((count, tokens) => count + tokens.length, 0),
    [tokensByAgent]
  );
  const tasksToday = useMemo(
    () =>
      events.filter((event) => isToday(event.created_at) && event.subject_type === 'task').length,
    [events]
  );
  const actorDirectory = useMemo(
    () => buildActorDirectory(adminAccounts ?? [], agents),
    [adminAccounts, agents]
  );
  const recentActivity = useMemo(
    () => events.slice(0, 6).map((event) => buildActivityItem(event, actorDirectory)),
    [events, actorDirectory]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-800 dark:text-[#E8E8EC]">
            {t('hub.welcome')} <span className="gradient-text">{t('hub.dualCosmos')}</span>
          </h1>
          <p className="text-gray-600 dark:text-[#9CA3AF]">
            {t('hub.signedInAs')} {email} {t('hub.withRole')} {role} {t('hub.access')}
          </p>
        </div>
        <Link href="/tokens">
          <Button variant="gradient" size="lg">
            <Sparkles className="mr-2 h-5 w-5" />
            {t('hub.openTokenOps')}
          </Button>
        </Link>
      </div>

      <Card className="border border-pink-100 bg-white/90 p-4 dark:bg-[#252540]/90">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-[#9CA3AF]">
          <Badge variant="primary">{t('hub.inviteOnly')}</Badge>
          <span>Live management snapshot for human supervisors and registered agents.</span>
          <span className="text-gray-300">•</span>
          <span>
            Counts and activity below come from backend-backed identity, review, remote agent
            access, and event queries.
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-6 w-6 text-sky-600" />}
          label={t('identities.humans')}
          value={adminAccountList.length}
          trend={t('hub.stats.humansTrend')}
          color="sky"
        />
        <StatCard
          icon={<Bot className="h-6 w-6 text-green-600" />}
          label={t('identities.agents')}
          value={agents.length}
          trend={t('hub.stats.agentsTrend')}
          color="green"
        />
        <StatCard
          icon={<KeyRound className="h-6 w-6 text-purple-600" />}
          label={t('navigation.tokens')}
          value={totalTokens}
          trend={t('hub.stats.tokensTrend')}
          color="purple"
        />
        <StatCard
          icon={<CheckSquare className="h-6 w-6 text-orange-600" />}
          label={t('hub.reviewQueue')}
          value={pendingReviews.length}
          trend={t('hub.stats.tasksTrend')}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
                {t('identities.title')}
              </h2>
              <div className="flex gap-2">
                <Badge variant="human">
                  {adminAccountList.length} {t('identities.humans')}
                </Badge>
                <Badge variant="agent">
                  {agents.length} {t('identities.agents')}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
                    Human supervisors
                  </h3>
                  <Badge variant="human">{adminAccountList.length}</Badge>
                </div>
                <div className="space-y-3">
                  {adminAccountList.map((account) => (
                    <div
                      key={account.id}
                      className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                            {account.display_name}
                          </p>
                          <p className="mt-1 break-all text-sm text-gray-500 dark:text-[#9CA3AF]">
                            {account.email}
                          </p>
                        </div>
                        <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                          {account.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {adminAccountList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-4 text-sm text-gray-500 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55 dark:text-[#9CA3AF]">
                      No human supervisors have been loaded yet.
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
                    Agent identities
                  </h3>
                  <Badge variant="agent">{agents.length}</Badge>
                </div>
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">
                            {agent.name}
                          </p>
                          <p className="mt-1 break-all text-sm text-gray-500 dark:text-[#9CA3AF]">
                            {agent.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="agent">{agent.risk_tier}</Badge>
                          <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                            {agent.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(tokensByAgent[agent.id] ?? []).map((token) => (
                          <Badge key={token.id} variant="info">
                            {token.displayName}
                          </Badge>
                        ))}
                        {(tokensByAgent[agent.id] ?? []).length === 0 ? (
                          <span className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                            No remote access tokens
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-4 text-sm text-gray-500 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55 dark:text-[#9CA3AF]">
                      No registered agents have been loaded yet.
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
                {t('hub.recentActivity')}
              </h2>
              <Link href="/inbox">
                <Button variant="ghost" size="sm">
                  Open inbox <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-pink-100">
                {recentActivity.length === 0 && (
                  <div className="p-6 text-sm text-gray-500 dark:text-[#9CA3AF]">
                    Agent feedback, task completions, and system alerts will appear here once events
                    start flowing.
                  </div>
                )}
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-pink-50/30"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-semibold',
                        activity.actorType === 'agent'
                          ? 'bg-green-100 text-green-700 dark:bg-[#2D4A3D] dark:text-green-300'
                          : 'bg-sky-100 text-sky-700 dark:bg-[#2D4A5D] dark:text-sky-300'
                      )}
                    >
                      {activity.actorLabel.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 dark:text-[#E8E8EC]">
                        {activity.summary}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-[#9CA3AF]">
                        {activity.actorLabel} · {activity.details}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{activity.time}</p>
                    </div>
                    <Badge variant={activity.badgeVariant} className="flex-shrink-0">
                      {activity.badgeLabel}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {t('hub.quickActions')}
            </h3>
            <div className="space-y-3">
              <ActionButton
                href="/tasks"
                icon={<Zap className="h-4 w-4" />}
                label={t('hub.publishTask')}
              />
              <ActionButton
                href="/tokens"
                icon={<KeyRound className="h-4 w-4" />}
                label={t('hub.manageTokens')}
              />
              <ActionButton
                href="/reviews"
                icon={<ShieldCheck className="h-4 w-4" />}
                label={t('hub.reviewQueue')}
              />
              <ActionButton
                href="/settings"
                icon={<Users className="h-4 w-4" />}
                label={t('hub.inviteAdmin')}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-[#E8E8EC]">
              {t('hub.reviewQueue')}
            </h3>
            <div className="space-y-2">
              {pendingReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-pink-100 bg-white/70 p-4 text-sm text-gray-500 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/55 dark:text-[#9CA3AF]">
                  No pending reviews in the queue.
                </div>
              ) : (
                pendingReviews.slice(0, 4).map((item) => (
                  <div
                    key={`${item.resource_kind}-${item.resource_id}`}
                    className="rounded-2xl border border-pink-100 bg-white/70 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60"
                  >
                    <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
                      {item.resource_kind} · {item.created_by_actor_id ?? 'unknown-agent'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
              <h3 className="font-semibold text-green-800">{t('hub.controlSurfaceReady')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-green-700">
                <span>{t('hub.bootstrap')}</span>
                <span className="font-medium">{t('hub.initialized')}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>{t('hub.managementSession')}</span>
                <span className="font-medium">{t('hub.active')}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>{t('hub.reviewGate')}</span>
                <span className="font-medium">{t('hub.enabled')}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>{t('hub.tasksToday')}</span>
                <span className="font-medium">{tasksToday}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
});

const StatCard = memo(function StatCard({
  icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  trend: string;
  color: 'sky' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    sky: 'bg-sky-50 text-sky-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-medium">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl',
          colorClasses[color]
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 dark:text-[#E8E8EC]">{value}</p>
        <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">{label}</p>
        <p className="mt-1 text-xs text-gray-400">{trend}</p>
      </div>
    </Card>
  );
});

const ActionButton = memo(function ActionButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-700 transition-colors hover:bg-pink-50 dark:text-[#E8E8EC]"
    >
      <span className="text-pink-500">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
});

const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

function isToday(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatRelativeTime(timeString: string) {
  const date = new Date(timeString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}

function eventBadgeVariant(event: Event): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (event.severity) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
    case 'critical':
      return 'error';
    case 'info':
      return 'info';
    default:
      return 'default';
  }
}

function eventBadgeLabel(event: Event) {
  return event.event_type.replace(/[_-]/g, ' ');
}

function buildActorDirectory(
  adminAccounts: Array<{ id: string; display_name: string }>,
  agents: Array<{ id: string; name: string }>
) {
  const actorMap = new Map<string, { label: string; type: 'human' | 'agent' }>();

  adminAccounts.forEach((account) => {
    actorMap.set(account.id, {
      label: account.display_name,
      type: 'human',
    });
  });

  agents.forEach((agent) => {
    actorMap.set(agent.id, {
      label: agent.name,
      type: 'agent',
    });
  });

  return actorMap;
}

function buildActivityItem(
  event: Event,
  actorDirectory: Map<string, { label: string; type: 'human' | 'agent' }>
) {
  const actor = actorDirectory.get(event.actor_id);

  return {
    id: event.id,
    summary: event.summary,
    details: event.details ?? `${event.subject_type} ${event.subject_id}`,
    time: formatRelativeTime(event.created_at),
    actorLabel: actor?.label ?? event.actor_id,
    actorType: actor?.type ?? event.actor_type,
    badgeLabel: eventBadgeLabel(event),
    badgeVariant: eventBadgeVariant(event),
  };
}
