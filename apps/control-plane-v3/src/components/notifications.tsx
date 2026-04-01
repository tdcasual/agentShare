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

  if (diffMins < 1) {return 'Just now';}
  if (diffMins < 60) {return `${diffMins}m ago`;}
  if (diffHours < 24) {return `${diffHours}h ago`;}
  if (diffDays < 7) {return `${diffDays}d ago`;}
  return date.toLocaleDateString();
}

export function Notifications({ className }: NotificationsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { availability, notifications, isLoading, error, mutate } = useNotifications();
  const { markAllRead, markOneRead, isMarking } = useMarkNotificationsRead();

  const unreadEvents = useMemo(() => notifications.filter((event) => !event.read_at), [notifications]);
  const unreadIds = useMemo(() => unreadEvents.map((event) => event.id), [unreadEvents]);
  const unreadCount = unreadEvents.length;
  const eventsToShow = useMemo(() => notifications.slice(0, MAX_DROPDOWN_EVENTS), [notifications]);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClickOutside]);

  useEffect(() => {
    if (!isOpen) {return undefined;}
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleMarkAllRead = useCallback(async () => {
    if (unreadIds.length === 0) {return;}
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
          'p-2.5 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
          isOpen
            ? 'bg-pink-50 dark:bg-[#3D3D5C] text-pink-600 dark:text-[#E891C0]'
            : 'text-gray-500 dark:text-[#9CA3AF] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] hover:text-pink-600 dark:hover:text-[#E891C0]'
        )}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DB2777] dark:bg-[#E891C0] text-white text-[10px] font-bold flex items-center justify-center">
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
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#252540] rounded-2xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden z-50 animate-slide-up"
          >
            <div className="p-4 border-b border-pink-100 dark:border-[#3D3D5C] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">{hubLabel}</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-0.5">{unreadCount} unread</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={isMarking}
                    className="text-sm text-pink-600 dark:text-[#E891C0] hover:text-pink-700 dark:hover:text-[#C77DAA] hover:bg-pink-50 dark:hover:bg-[#3D3D5C]"
                  >
                    {isMarking ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    Mark all read
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3D3D5C] text-gray-400 dark:text-[#9CA3AF] transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading && (
                <div className="p-8 flex flex-col items-center justify-center text-gray-500 dark:text-[#9CA3AF]">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-sm">Loading activity...</p>
                </div>
              )}

              {!isLoading && availability === 'unavailable' && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3D3D5C] flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-gray-400 dark:text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                    Notifications are unavailable
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#9CA3AF] mt-1">
                    This environment does not yet publish an events feed.
                  </p>
                </div>
              )}

              {!isLoading && availability !== 'unavailable' && Boolean(error) && (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">Failed to load events</p>
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                    {error instanceof Error ? error.message : 'Please try again later'}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-3">
                    Retry
                  </Button>
                </div>
              )}

              {!isLoading && availability !== 'unavailable' && !error && eventsToShow.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3D3D5C] flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-gray-400 dark:text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">No activity yet</p>
                  <p className="text-xs text-gray-400 dark:text-[#9CA3AF] mt-1">We will surface agent feedback and system alerts here.</p>
                </div>
              )}

              {!isLoading && availability !== 'unavailable' && !error && eventsToShow.length > 0 && (
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
                          'w-full text-left px-4 py-3 transition-colors flex items-start gap-3 cursor-pointer',
                          unread ? 'bg-pink-50/40 dark:bg-[#3D2D4A]/60' : 'hover:bg-pink-50/30 dark:hover:bg-[#2D2D50]'
                        )}
                      >
                        <span
                          className={cn(
                            'w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-lg font-medium',
                            style.bgClass,
                            style.textClass
                          )}
                          aria-hidden="true"
                        >
                          {style.icon}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('text-sm text-gray-800 dark:text-[#E8E8EC]', unread && 'font-semibold')}>
                              {notification.summary}
                            </p>
                            <span className="text-[11px] text-gray-400 dark:text-[#9CA3AF]">
                              {formatRelativeTime(notification.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#9CA3AF]">
                            <span className="uppercase tracking-wide">{notification.event_type}</span>
                            <span>·</span>
                            <span>{notification.actor_type}</span>
                          </div>
                          {notification.details && (
                            <p className="text-xs text-gray-500 dark:text-[#9CA3AF] truncate">
                              {notification.details}
                            </p>
                          )}
                        </div>
                        {notification.action_url && (
                          <ChevronRight className="w-4 h-4 text-gray-400 dark:text-[#9CA3AF]" aria-hidden="true" />
                        )}
                        {unread && <span className="w-2 h-2 rounded-full bg-pink-500 mt-1.5" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 dark:bg-[#1A1A2E] border-t border-pink-100 dark:border-[#3D3D5C]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  router.push('/inbox');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-pink-600 dark:text-[#E891C0] hover:text-pink-700 dark:hover:text-[#C77DAA] py-1 transition-colors"
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
