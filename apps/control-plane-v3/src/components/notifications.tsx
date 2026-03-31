/**
 * Notifications - 通知中心组件
 * 
 * 绑定真实后端数据或显式标记为不可用
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkNotificationsRead } from '@/hooks/use-notifications';
import { Button } from '@/shared/ui-primitives/button';

interface NotificationsProps {
  className?: string;
}

type NotificationType = 'agent' | 'human' | 'system' | 'warning' | 'success';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

export function Notifications({ className }: NotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 使用 SWR 获取真实通知数据
  const { availability, unavailableReason, notifications, isLoading, error, mutate } = useNotifications();
  const { markAllRead, isMarking } = useMarkNotificationsRead();

  // 计算未读数量
  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 标记全部已读
  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    await markAllRead();
    mutate(); // 刷新数据
  }, [unreadCount, markAllRead, mutate]);

  // 格式化时间显示
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // 获取图标和样式
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case 'agent':
        return {
          icon: '🤖',
          bgClass: 'bg-green-100 dark:bg-[#2D4A3D]',
          textClass: 'text-green-600 dark:text-green-400',
        };
      case 'human':
        return {
          icon: '👤',
          bgClass: 'bg-sky-100 dark:bg-[#2D4A5D]',
          textClass: 'text-sky-600 dark:text-sky-400',
        };
      case 'success':
        return {
          icon: '✓',
          bgClass: 'bg-green-100 dark:bg-[#2D4A3D]',
          textClass: 'text-green-600 dark:text-green-400',
        };
      case 'warning':
        return {
          icon: '⚠',
          bgClass: 'bg-amber-100 dark:bg-[#4A3D2D]',
          textClass: 'text-amber-600 dark:text-amber-400',
        };
      default:
        return {
          icon: '⚡',
          bgClass: 'bg-purple-100 dark:bg-[#3D2D4A]',
          textClass: 'text-purple-600 dark:text-purple-400',
        };
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* 通知按钮 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className={cn(
          'p-2.5 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2',
          isOpen
            ? 'bg-pink-50 dark:bg-[#3D3D5C] text-pink-600 dark:text-[#E891C0]'
            : 'text-gray-500 dark:text-[#9CA3AF] hover:bg-pink-50 dark:hover:bg-[#3D3D5C] hover:text-pink-600 dark:hover:text-[#E891C0]'
        )}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {availability !== 'unavailable' && unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DB2777] dark:bg-[#E891C0] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* 通知面板 */}
          <div
            ref={menuRef}
            role="menu"
            aria-label="Notifications"
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#252540] rounded-2xl shadow-xl border border-pink-100 dark:border-[#3D3D5C] overflow-hidden z-50 animate-slide-up"
          >
            {/* 头部 */}
            <div className="p-4 border-b border-pink-100 dark:border-[#3D3D5C] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
                  Notifications
                </h3>
                {availability !== 'unavailable' && unreadCount > 0 && (
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mt-0.5">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {availability !== 'unavailable' && unreadCount > 0 && (
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

            {/* 内容区域 */}
            <div className="max-h-80 overflow-y-auto">
              {/* 加载状态 */}
              {isLoading && (
                <div className="p-8 flex flex-col items-center justify-center text-gray-500 dark:text-[#9CA3AF]">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <p className="text-sm">Loading notifications...</p>
                </div>
              )}

              {!isLoading && availability === 'unavailable' && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3D3D5C] flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-gray-400 dark:text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                    Notifications are not available yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#9CA3AF] mt-1">
                    {unavailableReason ?? 'This shell does not have a backend notifications feed yet.'}
                  </p>
                </div>
              )}

              {/* 错误状态 */}
              {!isLoading && availability !== 'unavailable' && error && (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                    Failed to load notifications
                  </p>
                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                    {error instanceof Error ? error.message : 'Please try again later'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => mutate()}
                    className="mt-3"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* 空状态 */}
              {!isLoading && availability !== 'unavailable' && !error && notifications?.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#3D3D5C] flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-gray-400 dark:text-[#9CA3AF]" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-[#9CA3AF]">
                    No notifications yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#9CA3AF] mt-1">
                    We&apos;ll notify you when something happens
                  </p>
                </div>
              )}

              {/* 通知列表 */}
              {!isLoading && availability !== 'unavailable' && !error && notifications && notifications.length > 0 && (
                <div className="divide-y divide-pink-50 dark:divide-[#3D3D5C]/50">
                  {notifications.map((notification) => {
                    const style = getNotificationStyle(notification.type);
                    return (
                      <div
                        key={notification.id}
                        role="menuitem"
                        className={cn(
                          'p-4 hover:bg-pink-50/50 dark:hover:bg-[#2D2D50] transition-colors cursor-pointer',
                          !notification.read && 'bg-pink-50/30 dark:bg-[#3D2D4A]/30'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                              style.bgClass,
                              style.textClass
                            )}
                            aria-hidden="true"
                          >
                            {style.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm text-gray-700 dark:text-[#E8E8EC]',
                              !notification.read && 'font-medium'
                            )}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-[#9CA3AF] mt-1">
                              {formatTime(notification.time)}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0 mt-1.5" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 底部 */}
            {!isLoading && availability !== 'unavailable' && !error && notifications && notifications.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-[#1A1A2E] border-t border-pink-100 dark:border-[#3D3D5C]">
                <button
                  className="w-full text-center text-sm text-pink-600 dark:text-[#E891C0] hover:text-pink-700 dark:hover:text-[#C77DAA] py-1 transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
