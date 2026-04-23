'use client';

import { useCallback, useMemo, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2, Inbox } from 'lucide-react';
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
    <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--kw-text)]">{t('inbox.title')}</h1>
          <p className="text-sm text-[var(--kw-text-muted)]">{t('inbox.subtitle')}</p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="warning" className="px-3 py-1">
            {unreadCount} {t('inbox.unread')}
          </Badge>
        )}
      </div>

      {isLoading && events.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--kw-primary-500)]" />
        </div>
      )}

      {error && (
        <div className="bg-[var(--kw-rose-surface)]/10 flex items-center gap-2 rounded-xl border border-[var(--kw-rose-surface)] p-4 text-[var(--kw-error)]">
          <AlertCircle className="h-5 w-5" />
          <p>{error instanceof Error ? error.message : t('inbox.loadError')}</p>
        </div>
      )}

      {focusedEvent && (
        <Card
          role="region"
          aria-label={t('inbox.focusedEvent')}
          className="border-[var(--kw-primary-200)] dark:border-[var(--kw-dark-primary)]"
        >
          <CardHeader>
            <CardTitle className="text-lg">{t('inbox.focusedEvent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium text-[var(--kw-text)]">{focusedEvent.summary}</p>
              <p className="text-sm text-[var(--kw-text-muted)]">
                {formatRelativeTime(focusedEvent.created_at, t, locale)}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <EventActionButtons
              event={focusedEvent}
              t={t}
              onActionNavigate={handleActionNavigate}
              onMarkRead={handleMarkRead}
            />
          </CardFooter>
        </Card>
      )}

      {!isLoading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--kw-border)] bg-white/70 py-16 text-center dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]/60">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-primary-100)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]">
            <Inbox className="h-8 w-8" />
          </div>
          <p className="text-base font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
            {t('inbox.emptyTitle')}
          </p>
          <p className="mt-1 max-w-xs text-sm text-[var(--kw-text-muted)]">
            {t('inbox.emptyDesc')}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {events.map((event) => (
          <Card
            key={event.id}
            data-testid={`inbox-event-${event.id}`}
            data-focus-state={event.id === selectedEventId ? 'focused' : 'default'}
            className={cn(
              'transition-shadow hover:shadow-sm',
              !event.read_at &&
                'border-[var(--kw-primary-200)] dark:border-[var(--kw-dark-primary)]'
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base font-medium">{event.summary}</CardTitle>
                <span className="text-xs text-[var(--kw-text-muted)]">
                  {formatRelativeTime(event.created_at, t, locale)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--kw-text-muted)]">
                <Badge variant={severityVariantMap[event.severity ?? ''] ?? 'info'}>
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
              <EventActionButtons
                event={event}
                t={t}
                onActionNavigate={handleActionNavigate}
                onMarkRead={handleMarkRead}
              />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
});

interface EventActionButtonsProps {
  event: Event;
  t: ReturnType<typeof useI18n>['t'];
  onActionNavigate: (actionUrl?: string) => void;
  onMarkRead: (eventId: string) => void;
}

const EventActionButtons = memo(function EventActionButtons({
  event,
  t,
  onActionNavigate,
  onMarkRead,
}: EventActionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {event.action_url && (
        <Button variant="ghost" size="sm" onClick={() => onActionNavigate(event.action_url)}>
          {getActionLabel(event, t)}
        </Button>
      )}
      {!event.read_at && (
        <Button variant="ghost" size="sm" onClick={() => onMarkRead(event.id)}>
          {t('inbox.markAsRead')}
        </Button>
      )}
    </div>
  );
});
