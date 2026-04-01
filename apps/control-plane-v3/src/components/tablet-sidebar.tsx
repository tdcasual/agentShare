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
  Menu
} from 'lucide-react';
import { useState, useCallback, memo } from 'react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard className="w-5 h-5" />, label: '控制台', href: '/' },
  { icon: <KeyRound className="w-5 h-5" />, label: '令牌', href: '/tokens' },
  { icon: <CheckSquare className="w-5 h-5" />, label: '任务', href: '/tasks', badge: 3 },
  { icon: <ShieldCheck className="w-5 h-5" />, label: '审核', href: '/reviews' },
  { icon: <Settings className="w-5 h-5" />, label: '设置', href: '/settings' },
];

export function getTabletShellNavTargets() {
  return navItems.map((item) => item.href);
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
  const device = useDeviceType();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // 只在平板设备显示
  if (!device.isTablet) {return null;}

  const width = device.isTabletLandscape || isCollapsed ? 'w-20' : 'w-56';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-white dark:bg-[#1a1a2e]',
        'border-r border-[#e0e0e0] dark:border-[#252540]',
        'z-40 transition-all duration-300 ease-in-out',
        'flex flex-col',
        width,
        device.isTabletPortrait && 'shadow-lg'
      )}
    >
      {/* Logo / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]">
        {(!isCollapsed || device.isTabletLandscape) && (
          <Link 
            href="/" 
            className="flex items-center gap-2 text-[var(--kw-primary-500)] font-bold text-lg"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--kw-primary-400)] to-[var(--kw-primary-500)] flex items-center justify-center text-white text-sm font-bold">
              CP
            </div>
            {!device.isTabletLandscape && <span>Control</span>}
          </Link>
        )}
        
        {/* 只在平板竖屏显示折叠按钮 */}
        {device.isTabletPortrait && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-[var(--kw-surface-alt)] dark:hover:bg-[var(--kw-dark-surface-alt)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]"
            aria-label={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
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
        <div className="p-4 border-t border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--kw-primary-400)] to-[var(--kw-warning)] flex items-center justify-center text-white font-bold text-sm">
              U
            </div>
            {!device.isTabletLandscape && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--kw-text)] dark:text-[var(--kw-dark-text)] truncate">User Name</p>
                <p className="text-xs text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)] truncate">user@example.com</p>
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
        'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
        'group relative focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)] focus-visible:ring-offset-2',
        isActive
          ? 'bg-[var(--kw-primary-500)]/10 text-[var(--kw-primary-500)] dark:bg-[var(--kw-dark-primary)]/20 dark:text-[var(--kw-dark-primary)]'
          : 'text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)] hover:bg-[var(--kw-surface-alt)] dark:hover:bg-[var(--kw-dark-surface-alt)] hover:text-[var(--kw-text)] dark:hover:text-[var(--kw-dark-text)]'
      )}
    >
      <span className={cn(
        'transition-transform duration-200',
        'group-hover:scale-110'
      )}>
        {item.icon}
      </span>
      
      {!isCollapsed && (
        <span className="font-medium text-sm">{item.label}</span>
      )}
      
      {/* Badge */}
      {item.badge && (
        <span className={cn(
          'min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold',
          'flex items-center justify-center',
          'bg-[var(--kw-primary-500)] text-white',
          isCollapsed && 'absolute -top-1 -right-1'
        )}>
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
      
      {/* 折叠状态下的 Tooltip */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--kw-text)] dark:bg-[var(--kw-dark-surface-alt)] text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
          {item.label}
          {item.badge && (
            <span className="ml-2 text-[var(--kw-primary-400)]">({item.badge})</span>
          )}
        </div>
      )}
    </Link>
  );
});

/**
 * TabletBottomNav - 平板竖屏时的底部导航（可选）
 * 
 * 当平板竖屏时，如果侧边栏空间不足，可以显示底部导航
 */
export function TabletBottomNav() {
  const device = useDeviceType();
  const pathname = usePathname();

  // 只在平板竖屏且需要时显示
  if (!device.isTabletPortrait) {return null;}

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--kw-surface)] dark:bg-[var(--kw-dark-surface)] border-t border-[var(--kw-border)] dark:border-[var(--kw-dark-border)] z-50 md:hidden">
      <div className="h-full flex items-center justify-around px-4">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[var(--kw-primary-400)]',
              pathname === item.href
                ? 'text-[var(--kw-primary-500)]'
                : 'text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]'
            )}
          >
            <span className="relative">
              {item.icon}
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--kw-primary-500)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
