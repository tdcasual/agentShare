'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDeviceType } from '@/hooks/use-device-type';
import {
  LayoutDashboard,
  Settings,
  KeyRound,
  CheckSquare,
  ShieldCheck,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { useState, useCallback, memo, useMemo } from 'react';
import { useI18n } from '@/components/i18n-provider';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

function useNavItems(): NavItem[] {
  const { t } = useI18n();
  return useMemo(
    () => [
      { icon: <LayoutDashboard className="h-5 w-5" />, label: t('navigation.hub'), href: '/' },
      { icon: <KeyRound className="h-5 w-5" />, label: t('navigation.tokens'), href: '/tokens' },
      { icon: <CheckSquare className="h-5 w-5" />, label: t('navigation.tasks'), href: '/tasks' },
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        label: t('navigation.reviews'),
        href: '/reviews',
      },
      {
        icon: <Settings className="h-5 w-5" />,
        label: t('navigation.settings'),
        href: '/settings',
      },
    ],
    [t]
  );
}

export function getTabletShellNavTargets() {
  return ['/', '/tokens', '/tasks', '/reviews', '/settings'];
}

/**
 * TabletSidebar - 平板专用侧边栏
 *
 * 支持三种模式:
 * - Mobile: 隐藏，使用底部导航
 * - Tablet Portrait: 图标+标签，可折叠，侧边固定
 * - Tablet Landscape: 仅图标，始终展开，侧边固定
 * - Desktop: 完整侧边栏（由 DesktopSidebar 处理）
 */
export function TabletSidebar() {
  const { t } = useI18n();
  const device = useDeviceType();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const navItems = useNavItems();
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // 只在平板设备显示
  if (!device.isTablet) {
    return null;
  }

  const width = device.isTabletLandscape || isCollapsed ? 'w-20' : 'w-56';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-white dark:bg-[var(--kw-dark-bg)]',
        'border-r border-[var(--kw-border)] dark:border-[var(--kw-dark-surface)]',
        'z-drawer transition-[width] duration-300 ease-in-out will-change-[width]',
        'flex flex-col',
        width,
        device.isTabletPortrait && 'shadow-lg'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-between border-b border-[var(--kw-border)] px-4 dark:border-[var(--kw-dark-border)]">
        {(!isCollapsed || device.isTabletLandscape) && (
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-[var(--kw-primary-500)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] text-sm font-bold text-white">
              CP
            </div>
            {!device.isTabletLandscape && <span>{t('tabletSidebar.title')}</span>}
          </Link>
        )}

        {/* 只在平板竖屏显示折叠按钮 */}
        {device.isTabletPortrait && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg p-2 transition-colors hover:bg-[var(--kw-surface-alt)] focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] dark:hover:bg-[var(--kw-dark-surface-alt)]"
            aria-label={isCollapsed ? t('tabletSidebar.expand') : t('tabletSidebar.collapse')}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            isCollapsed={device.isTabletLandscape || isCollapsed}
          />
        ))}
      </nav>

      {/* User Profile - 仅在展开时显示 */}
      {(!isCollapsed || device.isTabletLandscape) && (
        <div className="border-t border-[var(--kw-border)] p-4 dark:border-[var(--kw-dark-border)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--kw-primary-400)] to-[var(--kw-warning)] text-sm font-bold text-white">
              U
            </div>
            {!device.isTabletLandscape && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                  {t('tabletSidebar.userNamePlaceholder')}
                </p>
                <p className="truncate text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                  {t('tabletSidebar.userEmailPlaceholder')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}

const NavLink = memo(function NavLink({ item, isActive, isCollapsed }: NavLinkProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200',
        'group relative focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
        isActive
          ? 'bg-[var(--kw-primary-500)]/10 dark:bg-[var(--kw-dark-primary)]/20 text-[var(--kw-primary-500)] dark:text-[var(--kw-dark-primary)]'
          : 'text-[var(--kw-text-muted)] hover:bg-[var(--kw-surface-alt)] hover:text-[var(--kw-text)] dark:text-[var(--kw-dark-text-muted)] dark:hover:bg-[var(--kw-dark-surface-alt)] dark:hover:text-[var(--kw-dark-text)]'
      )}
    >
      <span className={cn('transition-transform duration-200', 'group-hover:scale-110')}>
        {item.icon}
      </span>

      {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}

      {/* Badge */}
      {item.badge && (
        <span
          className={cn(
            'h-5 min-w-[20px] rounded-full px-1.5 text-xs font-bold',
            'flex items-center justify-center',
            'bg-[var(--kw-primary-500)] text-white',
            isCollapsed && 'absolute -right-1 -top-1'
          )}
        >
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}

      {/* 折叠状态下的 Tooltip */}
      {isCollapsed && (
        <div className="invisible absolute left-full z-dropdown ml-2 whitespace-nowrap rounded-md bg-[var(--kw-text)] px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 dark:bg-[var(--kw-dark-surface-alt)]">
          {item.label}
          {item.badge && <span className="ml-2 text-[var(--kw-primary-400)]">({item.badge})</span>}
        </div>
      )}
    </Link>
  );
});
