'use client';

import { useCallback, useMemo, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Layout } from '@/interfaces/human/layout';
import { useEvents, useMarkEventRead } from '@/domains/event';
import { useI18n } from '@/components/i18n-provider';
import type { Event } from '@/domains/event';
import { Badge } from '@/shared/ui-primitives/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui-primitives/card';
import { Button } from '@/shared/ui-primitives/button';
import { cn } from '@/lib/utils';

const severityVariantMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
  critical: 'warning',
};

function formatRelativeTime(
  timeString: string,
  t: ReturnType<typeof useI18n>['t'],
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
    return t('hub.time.minutesAgo').replace('{n}', String(diffMins));
  }
  if (diffHours < 24) {
    return t('hub.time.hoursAgo').replace('{n}', String(diffHours));
  }
  if (diffDays < 7) {
    return t('hub.time.daysAgo').replace('{n}', String(diffDays));
  }
  return date.toLocaleDateString(locale);
}

function getActionLabel(event: Event, t: ReturnType<typeof useI18n>['t']) {
  switch (event.subject_type) {
    case 'task':
    case 'task_target':
      return t('inbox.actionLabels.openTask');
    case 'review':
      return t('inbox.actionLabels.openReview');
    case 'agent':
    case 'admin_account':
    case 'human':
      return t('inbox.actionLabels.openIdentity');
    case 'space':
      return t('inbox.actionLabels.openSpace');
    case 'secret':
    case 'capability':
      return t('inbox.actionLabels.openAsset');
    default:
      return t('inbox.actionLabels.openAction');
  }
}

export default function InboxPage() {
  return (
    <Layout>
      <InboxContent />
    </Layout>
  );
}

const InboxContent = memo(function InboxContent() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { events, isLoading, error, mutate } = useEvents();
  const markEventRead = useMarkEventRead();
  const selectedEventId = searchParams.get('eventId');

  const unreadCount = useMemo(() => events.filter((event) => !event.read_at).length, [events]);
  const focusedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const handleMarkRead = useCallback(
    async (eventId: string) => {
      try {
        await markEventRead(eventId);
      } finally {
        await mutate();
      }
    },
    [markEventRead, mutate]
  );

  const handleActionNavigate = useCallback(
    (actionUrl?: string) => {
      if (!actionUrl) {
        return;
      }
      if (actionUrl.startsWith('/')) {
        router.push(actionUrl);
        return;
      }
      if (typeof window !== 'undefined') {
        window.open(actionUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [router]
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {t('inbox.title')}
          </p>
          <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {t('inbox.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="uppercase tracking-wide" variant="info">
            {t('inbox.unread')} {unreadCount}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            {t('common.refresh')}
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--kw-border)] bg-white/80 py-12 text-sm text-[var(--kw-text-muted)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)] dark:text-[var(--kw-dark-text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('inbox.loading')}
        </div>
      )}

      {error && (
        <div className="bg-[var(--kw-rose-surface)]/80 dark:border-[var(--kw-dark-error-surface)]/50 dark:bg-[var(--kw-dark-error-surface)]/50 flex flex-col items-center gap-3 rounded-3xl border border-[var(--kw-error)] p-6 text-center text-sm text-[var(--kw-error)]">
          <AlertCircle className="h-6 w-6" />
          <p className="font-semibold">{t('inbox.loadError')}</p>
          <p className="text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
            {error instanceof Error ? error.message : t('inbox.tryAgain')}
          </p>
          <Button size="sm" onClick={() => mutate()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!isLoading && !error && events.length === 0 && (
        <Card variant="default">
          <CardContent>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('inbox.emptyTitle')}
            </p>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {t('inbox.emptyDesc')}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && focusedEvent && (
        <Card className="bg-[var(--kw-primary-50)]/70 dark:border-[var(--kw-dark-primary)]/60 dark:bg-[var(--kw-primary-500)]/10 border border-[var(--kw-primary-200)]">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)]">
                  {t('inbox.focusedEvent')}
                </p>
                <CardTitle>{focusedEvent.summary}</CardTitle>
              </div>
              <span className="text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                {formatRelativeTime(focusedEvent.created_at, t, locale)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
              {focusedEvent.details ?? t('inbox.noContext')}
            </p>
          </CardContent>
          <CardFooter>
            <div className="flex flex-wrap items-center gap-2">
              {focusedEvent.action_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleActionNavigate(focusedEvent.action_url)}
                >
                  {getActionLabel(focusedEvent, t)}
                </Button>
              )}
              {!focusedEvent.read_at && (
                <Button variant="ghost" size="sm" onClick={() => handleMarkRead(focusedEvent.id)}>
                  {t('inbox.markAsRead')}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-4">
        {!isLoading &&
          !error &&
          events.map((event) => (
            <Card
              key={event.id}
              data-testid={`inbox-event-${event.id}`}
              data-focus-state={event.id === selectedEventId ? 'focused' : 'default'}
              className={cn(
                'border-2 border-transparent',
                event.id === selectedEventId &&
                  'ring-[var(--kw-primary-400)]/20 border-[var(--kw-primary-400)] ring-1 dark:border-[var(--kw-primary-400)]',
                !event.read_at &&
                  'dark:border-[var(--kw-dark-primary)]/60 border-[var(--kw-primary-200)]'
              )}
            >
              <CardHeader>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>{event.summary}</CardTitle>
                  <span className="text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {formatRelativeTime(event.created_at, t, locale)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  <Badge variant={severityVariantMap[event.severity ?? 'info'] ?? 'info'}>
                    {event.event_type.replace(/[_-]/g, ' ')}
                  </Badge>
                  <span>
                    {t('inbox.actor')}: {event.actor_type} {event.actor_id}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {event.details ?? t('inbox.noContext')}
                </p>
                <div className="mt-4 grid gap-2 text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  <span>
                    {t('inbox.subject')}: {event.subject_type} {event.subject_id}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex flex-wrap items-center gap-2">
                  {event.action_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleActionNavigate(event.action_url)}
                    >
                      {getActionLabel(event, t)}
                    </Button>
                  )}
                  {!event.read_at && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(event.id)}>
                      {t('inbox.markAsRead')}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
      </div>
    </div>
  );
});
