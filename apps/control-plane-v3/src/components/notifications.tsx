'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Bell, Check, ChevronRight, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkNotificationsRead } from '@/hooks/use-notifications';
import { Button } from '@/shared/ui-primitives/button';
import type { Notification } from '@/hooks/use-notifications';

interface NotificationsProps {
  className?: string;
}

const MAX_DROPDOWN_EVENTS = 6;

const severityStyles: Record<string, { icon: string; bgClass: string; textClass: string }> = {
  success: {
    icon: '✅',
    bgClass: 'bg-green-100 dark:bg-[#2D4A3D]',
    textClass: 'text-green-600 dark:text-green-300',
  },
  warning: {
    icon: '⚠️',
    bgClass: 'bg-amber-100 dark:bg-[#4A3D2D]',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    icon: '❌',
    bgClass: 'bg-red-100 dark:bg-[#3D2D50]',
    textClass: 'text-red-600 dark:text-red-400',
  },
  info: {
    icon: 'ℹ️',
    bgClass: 'bg-sky-100 dark:bg-[#2D4A5D]',
    textClass: 'text-sky-600 dark:text-sky-400',
  },
  critical: {
    icon: '🔥',
    bgClass: 'bg-purple-100 dark:bg-[#3D2D4A]',
    textClass: 'text-purple-600 dark:text-purple-400',
  },
  default: {
    icon: '✨',
    bgClass: 'bg-purple-100 dark:bg-[#3D2D4A]',
    textClass: 'text-purple-600 dark:text-purple-400',
  },
};

function getSeverityStyle(severity?: string) {
  return severity && severityStyles[severity] ? severityStyles[severity] : severityStyles.default;
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

export function Notifications({ className }: NotificationsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { availability, notifications, isLoading, error, mutate } = useNotifications();
  const { markAllRead, markOneRead, isMarking } = useMarkNotificationsRead();

  const unreadEvents = useMemo(
    () => notifications.filter((event) => !event.read_at),
    [notifications]
  );
  const unreadIds = useMemo(() => unreadEvents.map((event) => event.id), [unreadEvents]);
  const unreadCount = unreadEvents.length;
  const eventsToShow = useMemo(() => notifications.slice(0, MAX_DROPDOWN_EVENTS), [notifications]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      menuRef.current &&
      !menuRef.current.contains(e.target as Node) &&
      buttonRef.current &&
      !buttonRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClickOutside]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadIds.length === 0) {
      return;
    }
    await markAllRead(unreadIds);
    mutate();
  }, [markAllRead, mutate, unreadIds]);

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

  const hubLabel = availability === 'unavailable' ? 'Notifications unavailable' : 'Notifications';

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${hubLabel}${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={cn(
          'relative rounded-full p-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
          isOpen
            ? 'bg-pink-50 text-pink-600 dark:bg-[#3D3D5C] dark:text-[#E891C0]'
            : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600 dark:text-[#9CA3AF] dark:hover:bg-[#3D3D5C] dark:hover:text-[#E891C0]'
        )}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#DB2777] px-1 text-[10px] font-bold text-white dark:bg-[#E891C0]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />

          <div
            ref={menuRef}
            role="menu"
            aria-label={hubLabel}
            className="absolute right-0 top-full z-50 mt-2 w-80 animate-slide-up overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl sm:w-96 dark:border-[#3D3D5C] dark:bg-[#252540]"
          >
            <div className="flex items-center justify-between border-b border-pink-100 p-4 dark:border-[#3D3D5C]">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">{hubLabel}</h3>
                {unreadCount > 0 && (
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-[#9CA3AF]">
                    {unreadCount} unread
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
                    className="text-sm text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:text-[#E891C0] dark:hover:bg-[#3D3D5C] dark:hover:text-[#C77DAA]"
                  >
                    {isMarking ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    Mark all read
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:text-[#9CA3AF] dark:hover:bg-[#3D3D5C]"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading && (
                <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-[#9CA3AF]">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin" />
                  <p className="text-sm">Loading activity...</p>
                </div>
              )}

              {!isLoading && availability === 'unavailable' && (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-[#3D3D5C]">
                    <Bell className="h-6 w-6 text-gray-400 dark:text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                    Notifications are unavailable
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-[#9CA3AF]">
                    This environment does not yet publish an events feed.
                  </p>
                </div>
              )}

              {!isLoading && availability !== 'unavailable' && Boolean(error) && (
                <div className="p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="mb-1 text-sm text-red-600 dark:text-red-400">
                    Failed to load events
                  </p>
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                    {error instanceof Error ? error.message : 'Please try again later'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-3">
                    Retry
                  </Button>
                </div>
              )}

              {!isLoading &&
                availability !== 'unavailable' &&
                !error &&
                eventsToShow.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-[#3D3D5C]">
                      <Bell className="h-6 w-6 text-gray-400 dark:text-[#9CA3AF]" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">No activity yet</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-[#9CA3AF]">
                      We will surface agent feedback and system alerts here.
                    </p>
                  </div>
                )}

              {!isLoading &&
                availability !== 'unavailable' &&
                !error &&
                eventsToShow.length > 0 && (
                  <div className="divide-y divide-pink-50 dark:divide-[#3D3D5C]/50">
                    {eventsToShow.map((notification) => {
                      const style = getSeverityStyle(notification.severity);
                      const unread = !notification.read_at;
                      return (
                        <button
                          type="button"
                          key={notification.id}
                          role="menuitem"
                          onClick={() => handleEventClick(notification)}
                          className={cn(
                            'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors',
                            unread
                              ? 'bg-pink-50/40 dark:bg-[#3D2D4A]/60'
                              : 'hover:bg-pink-50/30 dark:hover:bg-[#2D2D50]'
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
                                  'text-sm text-gray-800 dark:text-[#E8E8EC]',
                                  unread && 'font-semibold'
                                )}
                              >
                                {notification.summary}
                              </p>
                              <span className="text-[11px] text-gray-400 dark:text-[#9CA3AF]">
                                {formatRelativeTime(notification.created_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#9CA3AF]">
                              <span className="uppercase tracking-wide">
                                {notification.event_type}
                              </span>
                              <span>·</span>
                              <span>{notification.actor_type}</span>
                            </div>
                            {notification.details && (
                              <p className="truncate text-xs text-gray-500 dark:text-[#9CA3AF]">
                                {notification.details}
                              </p>
                            )}
                          </div>
                          {notification.action_url && (
                            <ChevronRight
                              className="h-4 w-4 text-gray-400 dark:text-[#9CA3AF]"
                              aria-hidden="true"
                            />
                          )}
                          {unread && (
                            <span
                              className="mt-1.5 h-2 w-2 rounded-full bg-pink-500"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>

            <div className="border-t border-pink-100 bg-gray-50 p-3 dark:border-[#3D3D5C] dark:bg-[#1A1A2E]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  router.push('/inbox');
                  setIsOpen(false);
                }}
                className="w-full py-1 text-center text-sm text-pink-600 transition-colors hover:text-pink-700 dark:text-[#E891C0] dark:hover:text-[#C77DAA]"
              >
                Open inbox
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
