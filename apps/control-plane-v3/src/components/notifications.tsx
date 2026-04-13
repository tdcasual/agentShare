'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Bell, Check, ChevronRight, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkNotificationsRead } from '@/hooks/use-notifications';
import { Button } from '@/shared/ui-primitives/button';
import type { Notification } from '@/hooks/use-notifications';
import { useI18n } from '@/components/i18n-provider';
import { useFocusTrap } from '@/hooks/use-focus-trap';

interface NotificationsProps {
  className?: string;
}

const MAX_DROPDOWN_EVENTS = 6;

const severityStyles: Record<string, { icon: string; bgClass: string; textClass: string }> = {
  success: {
    icon: '✅',
    bgClass: 'bg-[var(--kw-green-surface)] dark:bg-[var(--kw-dark-green-accent-surface)]',
    textClass: 'text-[var(--kw-green-text)] dark:text-[var(--kw-dark-mint)]',
  },
  warning: {
    icon: '⚠️',
    bgClass: 'bg-[var(--kw-amber-surface)] dark:bg-[var(--kw-dark-amber-surface)]',
    textClass: 'text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]',
  },
  error: {
    icon: '❌',
    bgClass: 'bg-[var(--kw-rose-surface)] dark:bg-[var(--kw-dark-rose-surface)]',
    textClass: 'text-[var(--kw-error)] dark:text-[var(--kw-error)]',
  },
  info: {
    icon: 'ℹ️',
    bgClass: 'bg-[var(--kw-sky-surface)] dark:bg-[var(--kw-dark-sky-accent-surface)]',
    textClass: 'text-[var(--kw-sky-text)] dark:text-[var(--kw-dark-sky)]',
  },
  critical: {
    icon: '🔥',
    bgClass: 'bg-[var(--kw-purple-surface)] dark:bg-[var(--kw-dark-purple-accent-surface)]',
    textClass: 'text-[var(--kw-purple-text)] dark:text-[var(--kw-dark-primary)]',
  },
  default: {
    icon: '✨',
    bgClass: 'bg-[var(--kw-purple-surface)] dark:bg-[var(--kw-dark-purple-accent-surface)]',
    textClass: 'text-[var(--kw-purple-text)] dark:text-[var(--kw-dark-primary)]',
  },
};

function getSeverityStyle(severity?: string) {
  return severity && severityStyles[severity] ? severityStyles[severity] : severityStyles.default;
}

function formatRelativeTime(
  timeString: string,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: string
) {
  const date = new Date(timeString);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return t('time.justNow');
  }
  if (diffMins < 60) {
    return t('time.minutesAgo', { n: diffMins });
  }
  if (diffHours < 24) {
    return t('time.hoursAgo', { n: diffHours });
  }
  if (diffDays < 7) {
    return t('time.daysAgo', { n: diffDays });
  }
  return date.toLocaleDateString(locale);
}

export function Notifications({ className }: NotificationsProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { containerRef } = useFocusTrap({
    isActive: isOpen,
    onEscape: () => setIsOpen(false),
    onFocusOutside: () => setIsOpen(false),
  });

  const { availability, notifications, isLoading, error, mutate } = useNotifications();
  const { markAllRead, markOneRead, isMarking } = useMarkNotificationsRead();

  const unreadEvents = useMemo(
    () => notifications.filter((event) => !event.read_at),
    [notifications]
  );
  const unreadIds = useMemo(() => unreadEvents.map((event) => event.id), [unreadEvents]);
  const unreadCount = unreadEvents.length;
  const eventsToShow = useMemo(() => notifications.slice(0, MAX_DROPDOWN_EVENTS), [notifications]);



  const [markAllError, setMarkAllError] = useState<string | null>(null);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadIds.length === 0) {
      return;
    }
    setMarkAllError(null);
    try {
      await markAllRead(unreadIds);
      await mutate();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('notifications.errors.markAllReadFailed');
      setMarkAllError(message);
    }
  }, [markAllRead, mutate, t, unreadIds]);

  const handleEventClick = useCallback(
    async (event: Notification) => {
      if (!event.read_at) {
        await markOneRead(event.id);
      }

      if (event.action_url) {
        if (event.action_url.startsWith('/')) {
          router.push(event.action_url);
        } else {
          window.open(event.action_url, '_blank', 'noopener,noreferrer');
        }
      }
    },
    [markOneRead, router]
  );

  const hubLabel =
    availability === 'unavailable' ? t('notifications.unavailableLabel') : t('notifications.title');

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={
          unreadCount > 0
            ? t('notifications.buttonAriaLabelWithUnread', { label: hubLabel, count: unreadCount })
            : hubLabel
        }
        className={cn(
          'relative rounded-full p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
          isOpen
            ? 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]'
            : 'text-[var(--kw-text-muted)] hover:bg-[var(--kw-primary-50)] hover:text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-border)] dark:hover:text-[var(--kw-dark-primary)]'
        )}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--kw-primary-500)] px-1 text-[10px] font-bold text-white dark:bg-[var(--kw-dark-primary)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={containerRef}
          role="menu"
          aria-label={hubLabel}
          className="absolute right-0 top-full z-dropdown mt-2 w-80 animate-slide-up overflow-hidden rounded-2xl border border-[var(--kw-border)] bg-white shadow-xl sm:w-96 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]"
        >
            <div className="flex items-center justify-between border-b border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
              <div>
                <h3 className="font-semibold text-[var(--kw-text)]">{hubLabel}</h3>
                {unreadCount > 0 && (
                  <p className="mt-0.5 text-xs text-[var(--kw-text-muted)]">
                    {t('notifications.unreadCount', { count: unreadCount })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={isMarking}
                    className="text-sm text-[var(--kw-primary-600)] hover:bg-[var(--kw-primary-50)] hover:text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)] dark:hover:bg-[var(--kw-dark-border)] dark:hover:text-[var(--kw-dark-primary)]"
                  >
                    {isMarking ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    {t('notifications.markAllRead')}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-[var(--kw-text-muted)] transition-colors hover:bg-[var(--kw-surface-alt)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-border)]"
                  aria-label={t('common.closeNotifications')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {markAllError && (
              <div className="border-b border-[var(--kw-rose-surface)] bg-[var(--kw-rose-surface)]/20 px-4 py-2 text-xs text-[var(--kw-error)] dark:border-[var(--kw-dark-border)]">
                {markAllError}
              </div>
            )}
            <div className="max-h-96 overflow-y-auto">
              {isLoading && (
                <div className="flex flex-col items-center justify-center p-8 text-[var(--kw-text-muted)]">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                  <p className="text-sm">{t('notifications.loading')}</p>
                </div>
              )}

              {!isLoading && availability === 'unavailable' && (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-surface-alt)] dark:bg-[var(--kw-dark-border)]">
                    <Bell className="h-6 w-6 text-[var(--kw-text-muted)]" />
                  </div>
                  <p className="text-sm text-[var(--kw-text-muted)]">
                    {t('notifications.unavailableTitle')}
                  </p>
                  <p className="mt-1 text-xs text-[var(--kw-text-muted)]">
                    {t('notifications.unavailableDescription')}
                  </p>
                </div>
              )}

              {!isLoading && availability !== 'unavailable' && Boolean(error) && (
                <div className="p-6 text-center">
                  <div className="dark:bg-[var(--kw-dark-error-surface)]/20 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
                    <AlertCircle className="h-6 w-6 text-[var(--kw-error)] dark:text-[var(--kw-error)]" />
                  </div>
                  <p className="mb-1 text-sm text-[var(--kw-error)] dark:text-[var(--kw-error)]">
                    {t('notifications.errors.loadFailed')}
                  </p>
                  <p className="text-xs text-[var(--kw-text-muted)]">
                    {error instanceof Error ? error.message : t('common.tryAgainLater')}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-3">
                    {t('common.retry')}
                  </Button>
                </div>
              )}

              {!isLoading &&
                availability !== 'unavailable' &&
                !error &&
                eventsToShow.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--kw-surface-alt)] dark:bg-[var(--kw-dark-border)]">
                      <Bell className="h-6 w-6 text-[var(--kw-text-muted)]" />
                    </div>
                    <p className="text-sm text-[var(--kw-text-muted)]">
                      {t('notifications.emptyTitle')}
                    </p>
                    <p className="mt-1 text-xs text-[var(--kw-text-muted)]">
                      {t('notifications.emptyDescription')}
                    </p>
                  </div>
                )}

              {!isLoading &&
                availability !== 'unavailable' &&
                !error &&
                eventsToShow.length > 0 && (
                  <div className="dark:divide-[var(--kw-dark-border)]/50 divide-y divide-[var(--kw-primary-50)]">
                    {eventsToShow.map((notification) => {
                      const style = getSeverityStyle(notification.severity);
                      const unread = !notification.read_at;
                      return (
                        <button
                          type="button"
                          key={notification.id}
                          role="menuitem"
                          aria-label={`${unread ? `${t('notifications.unreadLabel')} ` : ''}${
                            notification.summary || t('notifications.notification')
                          }`}
                          onClick={() => handleEventClick(notification)}
                          className={cn(
                            'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors',
                            unread
                              ? 'bg-[var(--kw-primary-50)]/40 dark:bg-[var(--kw-dark-purple-accent-surface)]/60'
                              : 'hover:bg-[var(--kw-primary-50)]/30 dark:hover:bg-[var(--kw-dark-surface-alt)]'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-medium',
                              style.bgClass,
                              style.textClass
                            )}
                            aria-hidden="true"
                          >
                            {style.icon}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={cn(
                                  'text-sm text-[var(--kw-text)]',
                                  unread && 'font-semibold'
                                )}
                              >
                                {unread && (
                                  <span className="sr-only">{t('notifications.unreadLabel')}</span>
                                )}
                                {notification.summary}
                              </p>
                              <span className="text-[11px] text-[var(--kw-text-muted)]">
                                {formatRelativeTime(notification.created_at, t, locale)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--kw-text-muted)]">
                              <span className="uppercase tracking-wide">
                                {notification.event_type}
                              </span>
                              <span>·</span>
                              <span>{notification.actor_type}</span>
                            </div>
                            {notification.details && (
                              <p className="truncate text-xs text-[var(--kw-text-muted)]">
                                {notification.details}
                              </p>
                            )}
                          </div>
                          {notification.action_url && (
                            <ChevronRight
                              className="h-4 w-4 text-[var(--kw-text-muted)]"
                              aria-hidden="true"
                            />
                          )}
                          {unread && (
                            <span
                              className="mt-1.5 h-2 w-2 rounded-full bg-[var(--kw-primary-500)]"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>

            <div className="border-t border-[var(--kw-border)] bg-[var(--kw-surface-alt)] p-3 dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-bg)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  router.push('/inbox');
                  setIsOpen(false);
                }}
                className="w-full py-1 text-center text-sm text-[var(--kw-primary-600)] transition-colors hover:text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-primary)] dark:hover:text-[var(--kw-dark-primary)]"
              >
                {t('notifications.openInbox')}
              </Button>
            </div>
        </div>
      )}
    </div>
  );
}
