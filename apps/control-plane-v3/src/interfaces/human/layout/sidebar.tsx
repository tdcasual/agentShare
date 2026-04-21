/**
 * Sidebar - 角色感知侧边栏导航
 *
 * 根据用户角色动态显示/隐藏菜单项
 * 四级角色：viewer < operator < admin < owner
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { useRole } from '@/hooks/use-role';
import { hasRequiredRole } from '@/lib/role-system';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SHELL_NAV_ITEMS, getVisibleShellNavItems } from '@/lib/control-plane-links';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { role, isLoading } = useRole();

  // 根据角色过滤导航项
  const visibleNavItems = React.useMemo(() => {
    if (!role) {
      return [];
    }
    return getVisibleShellNavItems(role, { includeSettings: false });
  }, [role]);

  // 根据角色过滤底部导航项
  const visibleBottomNavItems = React.useMemo(() => {
    if (!role) {
      return [];
    }
    return SHELL_NAV_ITEMS.filter(
      (item) => item.settings && hasRequiredRole(role, item.requiredRole)
    );
  }, [role]);

  // 角色加载中显示骨架屏
  if (isLoading) {
    return (
      <aside
        className={cn(
          'fixed left-0 top-0 z-drawer h-screen border-r border-[var(--kw-border)] bg-white transition-[width] duration-300 will-change-[width] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center border-b border-[var(--kw-border)] px-4 dark:border-[var(--kw-dark-border)]">
          <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-xl bg-[var(--kw-border)]" />
        </div>
        <nav className="space-y-2 p-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-[var(--kw-border)]/50 h-10 animate-pulse rounded-xl" />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-drawer h-screen border-r border-[var(--kw-border)] bg-white transition-[width] duration-300 will-change-[width] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-[var(--kw-border)] px-4 dark:border-[var(--kw-dark-border)]">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--kw-primary-500)] text-xl text-white"
          aria-label={t('common.sakuraLogo')}
          role="img"
        >
          <span aria-hidden="true">CP</span>
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="whitespace-nowrap font-bold text-[var(--kw-text)]">
              {t('sidebar.appName')}
            </h1>
            <p className="text-xs text-[var(--kw-text-muted)]">{t('sidebar.appTagline')}</p>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        type="button"
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--kw-border)] bg-white text-[var(--kw-text-muted)] shadow-sm transition-colors hover:border-[var(--kw-primary-300)] hover:text-[var(--kw-primary-500)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)] dark:text-[var(--kw-dark-text-muted)] dark:hover:border-[var(--kw-dark-primary)] dark:hover:text-[var(--kw-dark-primary)]"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Navigation */}
      <nav className="max-h-[calc(100vh-200px)] space-y-1 overflow-y-auto p-3">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]',
                isActive
                  ? 'bg-[var(--kw-primary-50)] text-[var(--kw-primary-600)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-primary)]'
                  : 'hover:bg-[var(--kw-surface-alt)]/50 dark:hover:bg-[var(--kw-dark-surface-alt)]/50 text-[var(--kw-text-muted)] hover:text-[var(--kw-primary-600)] dark:text-[var(--kw-dark-text-muted)] dark:hover:text-[var(--kw-dark-primary)]',
                collapsed && 'justify-center'
              )}
            >
              <span
                className={cn('transition-transform duration-200', isActive && 'scale-110')}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              {!collapsed && (
                <span className="flex-1 truncate font-medium">{t(item.labelKey)}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 space-y-1 border-t border-[var(--kw-border)] p-3 dark:border-[var(--kw-dark-border)]">
        {visibleBottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]',
                isActive
                  ? 'bg-[var(--kw-surface-alt)] text-[var(--kw-text)] dark:bg-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)]'
                  : 'hover:bg-[var(--kw-surface-alt)]/50 dark:hover:bg-[var(--kw-dark-surface-alt)]/50 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]',
                collapsed && 'justify-center'
              )}
            >
              <span aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              {!collapsed && <span className="font-medium">{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
