'use client';

import Link from 'next/link';
import React, { useMemo, memo } from 'react';
import { Layout } from '../interfaces/human/layout';
import { useEvents, type Event } from '@/domains/event';
import { useAccessTokens, useAdminAccounts, useOpenClawAgents } from '@/domains/identity';
import { useReviews } from '@/domains/review';
import { Card } from '../shared/ui-primitives/card';
import { Button } from '../shared/ui-primitives/button';
import { Badge } from '../shared/ui-primitives/badge';
import { useGlobalSession } from '@/lib/session-state';
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
import {
  translateAccountRole,
  translateAccountStatus,
  translateAgentStatus,
} from '@/lib/enum-labels';
import { cn } from '@/lib/utils';

const UsersIcon = <Users className="h-6 w-6 text-[var(--kw-sky-text)]" />;
const BotIcon = <Bot className="h-6 w-6 text-[var(--kw-green-text)]" />;
const KeyRoundIcon = <KeyRound className="h-6 w-6 text-[var(--kw-purple-text)]" />;
const CheckSquareIcon = <CheckSquare className="h-6 w-6 text-[var(--kw-orange-text)]" />;

export default function HubPage() {
  const { t } = useI18n();
  const session = useGlobalSession();

  // RouteGuard handles redirects; we just read the already-resolved global state.
  if (session.state === 'unavailable') {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card
          role="alert"
          aria-live="assertive"
          variant="default"
          className="w-full max-w-lg space-y-4 text-center"
        >
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--kw-primary-500)]">
              Control Plane V3
            </p>
            <h1 className="text-3xl font-bold text-[var(--kw-text)]">{t('hub.unableToOpen')}</h1>
            <p className="text-[var(--kw-text-muted)]">{session.error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (session.state !== 'authenticated' || !session.email || !session.role) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card variant="default" className="w-full max-w-lg space-y-4 text-center">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.35em] text-[var(--kw-primary-500)]">
              Control Plane V3
            </p>
            <h1 className="text-3xl font-bold text-[var(--kw-text)]">{t('hub.routing')}</h1>
            <p className="text-[var(--kw-text-muted)]">{t('hub.checkingStatus')}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      <HubContent email={session.email} role={session.role} />
    </Layout>
  );
}

const HubContent = memo(function HubContent({ email, role }: { email: string; role: string }) {
  const { locale, t } = useI18n();
  const { events } = useEvents();
  const adminAccountsQuery = useAdminAccounts();
  const openClawAgentsQuery = useOpenClawAgents();
  const accessTokensQuery = useAccessTokens();
  const reviewsQuery = useReviews();

  const adminAccounts = adminAccountsQuery.data?.items;
  const agents = useMemo(
    () => openClawAgentsQuery.data?.items ?? [],
    [openClawAgentsQuery.data?.items]
  );
  const accessTokens = useMemo(
    () => accessTokensQuery.data?.items ?? [],
    [accessTokensQuery.data?.items]
  );
  const accessTokensByAgentId = useMemo(
    () =>
      accessTokens.reduce<Record<string, typeof accessTokens>>((groups, token) => {
        if (token.subjectType !== 'openclaw_agent') {
          return groups;
        }
        groups[token.subjectId] = [...(groups[token.subjectId] ?? []), token];
        return groups;
      }, {}),
    [accessTokens]
  );
  const adminAccountList = adminAccounts ?? [];
  const pendingReviews = (reviewsQuery.data?.items ?? []).filter(
    (item) => item.publication_status === 'pending_review'
  );
  const totalTokens = accessTokens.length;
  const tasksToday = events.filter(
    (event) => isToday(event.created_at) && event.subject_type === 'task'
  ).length;
  const actorDirectory = useMemo(
    () => buildActorDirectory(adminAccounts ?? [], agents),
    [adminAccounts, agents]
  );
  const recentActivity = useMemo(
    () => events.slice(0, 6).map((event) => buildActivityItem(event, actorDirectory, t, locale)),
    [events, actorDirectory, t, locale]
  );

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-[var(--kw-text)] sm:text-3xl">
            {t('hub.welcome')} {t('hub.dualCosmos')}
          </h1>
          <p className="text-[var(--kw-text-muted)]">
            {t('hub.signedInAs')} {email} {t('hub.withRole')} {translateAccountRole(t, role)}{' '}
            {t('hub.access')}
          </p>
        </div>
        <Link href="/tokens">
          <Button
            variant="primary"
            size="sm"
            className="shrink-0 whitespace-nowrap md:h-11 md:px-8 md:text-base"
            leftIcon={<Sparkles className="h-4 w-4 md:h-5 md:w-5" />}
          >
            <span className="hidden md:inline">{t('hub.openTokenOps')}</span>
          </Button>
        </Link>
      </div>

      <Card className="dark:bg-[var(--kw-dark-surface)]/90 border border-[var(--kw-border)] bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--kw-text-muted)]">
          <Badge variant="primary">{t('hub.inviteOnly')}</Badge>
          <span>{t('hub.snapshotDescription')}</span>
          <span className="text-[var(--kw-border)]">•</span>
          <span>{t('hub.snapshotDataSource')}</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={UsersIcon}
          label={t('identities.humans')}
          value={adminAccountList.length}
          trend={t('hub.stats.humansTrend')}
          color="sky"
        />
        <StatCard
          icon={BotIcon}
          label={t('identities.agents')}
          value={agents.length}
          trend={t('hub.stats.agentsTrend')}
          color="green"
        />
        <StatCard
          icon={KeyRoundIcon}
          label={t('navigation.tokens')}
          value={totalTokens}
          trend={t('hub.stats.tokensTrend')}
          color="purple"
        />
        <StatCard
          icon={CheckSquareIcon}
          label={t('hub.reviewQueue')}
          value={pendingReviews.length}
          trend={t('hub.stats.tasksTrend')}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-3 sm:space-y-4 lg:space-y-6 lg:col-span-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--kw-text)]">
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
              <Card className="space-y-4 p-3 sm:p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[var(--kw-text)]">
                    {t('hub.humanSupervisors')}
                  </h3>
                  <Badge variant="human">{adminAccountList.length}</Badge>
                </div>
                <div className="space-y-3">
                  {adminAccountList.map((account) => (
                    <div
                      key={account.id}
                      className="dark:bg-[var(--kw-dark-surface-alt)]/60 rounded-xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--kw-text)]">
                            {account.display_name}
                          </p>
                          <p className="mt-1 break-words text-sm text-[var(--kw-text-muted)]">
                            {account.email}
                          </p>
                        </div>
                        <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                          {translateAccountRole(t, account.role)}
                        </Badge>
                        <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
                          {translateAccountStatus(t, account.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {adminAccountList.length === 0 ? (
                    <div className="dark:bg-[var(--kw-dark-surface-alt)]/55 rounded-xl border border-dashed border-[var(--kw-border)] bg-white/70 p-4 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
                      {t('hub.emptyHumans')}
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="space-y-4 p-3 sm:p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[var(--kw-text)]">
                    {t('hub.agentIdentities')}
                  </h3>
                  <Badge variant="agent">{agents.length}</Badge>
                </div>
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="dark:bg-[var(--kw-dark-surface-alt)]/60 rounded-xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--kw-text)]">{agent.name}</p>
                          <p className="mt-1 break-words text-sm text-[var(--kw-text-muted)]">
                            {agent.id}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="agent">{agent.risk_tier}</Badge>
                          <Badge variant={agent.status === 'active' ? 'success' : 'warning'}>
                            {translateAgentStatus(t, agent.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(accessTokensByAgentId[agent.id] ?? []).map((token) => (
                          <Badge key={token.id} variant="info">
                            {token.displayName}
                          </Badge>
                        ))}
                        {(accessTokensByAgentId[agent.id] ?? []).length === 0 ? (
                          <span className="text-xs text-[var(--kw-text-muted)]">
                            {t('hub.noTokens')}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 ? (
                    <div className="dark:bg-[var(--kw-dark-surface-alt)]/55 rounded-xl border border-dashed border-[var(--kw-border)] bg-white/70 p-4 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
                      {t('hub.emptyAgents')}
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--kw-text)]">
                {t('hub.recentActivity')}
              </h2>
              <Link href="/inbox">
                <Button variant="ghost" size="sm">
                  {t('hub.openInbox')} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-[var(--kw-border)]" role="list">
                {recentActivity.length === 0 && (
                  <div className="p-3 sm:p-4 lg:p-6 text-sm text-[var(--kw-text-muted)]">
                    {t('hub.emptyActivity')}
                  </div>
                )}
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    role="listitem"
                    className="hover:bg-[var(--kw-surface-alt)]/50 flex items-center gap-4 p-4 transition-colors"
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
                        activity.actorType === 'agent'
                          ? 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)] dark:bg-[var(--kw-dark-green-accent-surface)] dark:text-[var(--kw-dark-mint)]'
                          : 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)] dark:bg-[var(--kw-dark-sky-accent-surface)] dark:text-[var(--kw-dark-sky)]'
                      )}
                    >
                      {activity.actorLabel.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--kw-text)]">{activity.summary}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--kw-text-muted)]">
                        {activity.actorLabel} · {activity.details}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--kw-text-muted)]">{activity.time}</p>
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

        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          <Card className="p-3 sm:p-4 lg:p-6">
            <h3 className="mb-4 font-semibold text-[var(--kw-text)]">
              {t('hub.quickActions.title')}
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

          <Card className="p-3 sm:p-4 lg:p-6">
            <h3 className="mb-4 font-semibold text-[var(--kw-text)]">{t('hub.reviewQueue')}</h3>
            <div className="space-y-2">
              {pendingReviews.length === 0 ? (
                <div className="dark:bg-[var(--kw-dark-surface-alt)]/55 rounded-xl border border-dashed border-[var(--kw-border)] bg-white/70 p-4 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('hub.emptyReviews')}
                </div>
              ) : (
                pendingReviews.slice(0, 4).map((item) => (
                  <div
                    key={`${item.resource_kind}-${item.resource_id}`}
                    className="dark:bg-[var(--kw-dark-surface-alt)]/60 rounded-xl border border-[var(--kw-border)] bg-white/70 p-4 dark:border-[var(--kw-dark-border)]"
                  >
                    <p className="font-medium text-[var(--kw-text)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--kw-text-muted)]">
                      {item.resource_kind} · {item.created_by_actor_id ?? 'unknown-agent'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border border-[var(--kw-green-surface)] bg-[var(--kw-green-surface)] p-3 sm:p-4 lg:p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--kw-green-text)]" />
              <h3 className="font-semibold text-[var(--kw-green-text)]">
                {t('hub.controlSurfaceReady')}
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[var(--kw-green-text)]">
                <span>{t('hub.bootstrap')}</span>
                <span className="font-medium">{t('hub.initialized')}</span>
              </div>
              <div className="flex justify-between text-[var(--kw-green-text)]">
                <span>{t('hub.managementSession')}</span>
                <span className="font-medium">{t('hub.active')}</span>
              </div>
              <div className="flex justify-between text-[var(--kw-green-text)]">
                <span>{t('hub.reviewGate')}</span>
                <span className="font-medium">{t('hub.enabled')}</span>
              </div>
              <div className="flex justify-between text-[var(--kw-green-text)]">
                <span>{t('hub.stats.tasksToday')}</span>
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
    sky: 'bg-[var(--kw-sky-surface)] text-[var(--kw-sky-text)]',
    green: 'bg-[var(--kw-green-surface)] text-[var(--kw-green-text)]',
    purple: 'bg-[var(--kw-purple-surface)] text-[var(--kw-purple-text)]',
    orange: 'bg-[var(--kw-orange-surface)] text-[var(--kw-orange-text)]',
  };

  return (
    <Card className="flex items-center gap-3 p-3 transition-shadow hover:shadow-medium sm:gap-4 sm:p-4">
      <div
        className={cn('flex h-9 w-9 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl [&>svg]:h-4 [&>svg]:w-4 [&>svg]:sm:h-6 [&>svg]:sm:w-6', colorClasses[color])}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-[var(--kw-text)] sm:text-2xl">{value}</p>
        <p className="text-xs text-[var(--kw-text-muted)] sm:text-sm">{label}</p>
        <p className="mt-0.5 text-[10px] text-[var(--kw-text-muted)] sm:mt-1 sm:text-xs">{trend}</p>
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
      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[var(--kw-text)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:text-[var(--kw-dark-text)]"
    >
      <span className="text-[var(--kw-primary-500)]">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
});

function isToday(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatRelativeTime(
  timeString: string,
  t: (key: string, options?: Record<string, string | number>) => string,
  locale: string
) {
  const date = new Date(timeString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return t('hub.time.justNow');
  }
  if (diffMins < 60) {
    return t('hub.time.minutesAgo', { n: diffMins });
  }
  if (diffHours < 24) {
    return t('hub.time.hoursAgo', { n: diffHours });
  }
  if (diffDays < 7) {
    return t('hub.time.daysAgo', { n: diffDays });
  }
  return date.toLocaleDateString(locale);
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
  actorDirectory: Map<string, { label: string; type: 'human' | 'agent' }>,
  t: (key: string, options?: Record<string, string | number>) => string,
  locale: string
) {
  const actor = actorDirectory.get(event.actor_id);

  return {
    id: event.id,
    summary: event.summary,
    details: event.details ?? `${event.subject_type} ${event.subject_id}`,
    time: formatRelativeTime(event.created_at, t, locale),
    actorLabel: actor?.label ?? event.actor_id,
    actorType: actor?.type ?? event.actor_type,
    badgeLabel: eventBadgeLabel(event),
    badgeVariant: eventBadgeVariant(event),
  };
}
