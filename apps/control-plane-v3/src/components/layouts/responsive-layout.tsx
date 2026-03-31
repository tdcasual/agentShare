'use client';

import { cn } from '@/lib/utils';
import { useDeviceType } from '@/hooks/use-device-type';
import { TabletSidebar } from '@/components/tablet-sidebar';
import { memo } from 'react';

interface ResponsiveMainLayoutProps {
  children: React.ReactNode;
  className?: string;
  showTabletSidebar?: boolean;
}

/**
 * ResponsiveMainLayout - 响应式主布局
 * 
 * 自动适配所有设备类型:
 * - Mobile: 单列布局，底部导航
 * - Tablet Portrait: 可折叠侧边栏，内容区适配
 * - Tablet Landscape: 图标侧边栏，更多内容空间
 * - Desktop: 完整侧边栏，最大内容空间
 */
export const ResponsiveMainLayout = memo(function ResponsiveMainLayout({
  children,
  className,
  showTabletSidebar = true,
}: ResponsiveMainLayoutProps) {
  const device = useDeviceType();

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0f0f1a]">
      {/* 平板侧边栏 */}
      {showTabletSidebar && <TabletSidebar />}

      {/* 主内容区 */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          // 移动端: 无侧边栏，底部导航空间
          device.isMobile && 'pb-20',
          // 平板竖屏: 可折叠侧边栏 (56px)
          device.isTabletPortrait && 'pl-14 pb-0',
          // 平板横屏: 图标侧边栏 (80px)
          device.isTabletLandscape && 'pl-20',
          // 桌面: 完整侧边栏 (256px)
          device.isDesktop && 'pl-64',
          className
        )}
      >
        {children}
      </main>
    </div>
  );
});

/**
 * ResponsiveContainer - 响应式内容容器
 * 
 * 根据设备类型调整内边距和最大宽度
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const ResponsiveContainer = memo(function ResponsiveContainer({
  children,
  className,
  size = 'lg',
  padding = 'md',
}: ResponsiveContainerProps) {
  const device = useDeviceType();

  const sizeClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-3 py-3',
    md: cn(device.isMobile && 'px-4 py-4', device.isTablet && 'px-6 py-6', device.isDesktop && 'px-8 py-8'),
    lg: cn(device.isMobile && 'px-4 py-6', device.isTablet && 'px-6 py-8', device.isDesktop && 'px-10 py-10'),
  };

  return (
    <div
      className={cn(
        'mx-auto w-full',
        sizeClasses[size],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
});

/**
 * ResponsiveGrid - 响应式网格
 * 
 * 智能列数调整，平滑过渡无跳跃
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'none' | 'sm' | 'md' | 'lg';
  cols?: {
    mobile?: number;
    tabletPortrait?: number;
    tabletLandscape?: number;
    desktop?: number;
  };
}

export const ResponsiveGrid = memo(function ResponsiveGrid({
  children,
  className,
  gap = 'md',
  cols = {
    mobile: 1,
    tabletPortrait: 2,
    tabletLandscape: 3,
    desktop: 4,
  },
}: ResponsiveGridProps) {
  const device = useDeviceType();

  const gapClasses = {
    none: '',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  // 动态确定列数
  const getCols = () => {
    if (device.isMobile) return cols.mobile ?? 1;
    if (device.isTabletPortrait) return cols.tabletPortrait ?? 2;
    if (device.isTabletLandscape) return cols.tabletLandscape ?? 3;
    return cols.desktop ?? 4;
  };

  return (
    <div
      className={cn(
        'grid',
        gapClasses[gap],
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${getCols()}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
});

/**
 * ResponsiveCard - 响应式卡片
 * 
 * 根据设备调整卡片大小和阴影
 */
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export const ResponsiveCard = memo(function ResponsiveCard({
  children,
  className,
  hover = true,
  clickable = false,
  onClick,
}: ResponsiveCardProps) {
  const device = useDeviceType();

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--kw-surface)] dark:bg-[var(--kw-dark-surface)] rounded-2xl',
        'border border-[var(--kw-border)] dark:border-[var(--kw-dark-border)]',
        // 移动端更小阴影
        device.isMobile && 'shadow-sm',
        // 平板适中阴影
        device.isTablet && 'shadow-md',
        // 桌面更大阴影
        device.isDesktop && 'shadow-lg',
        // Hover 效果
        hover && 'transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5',
        // 可点击
        clickable && 'cursor-pointer active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
});

/**
 * ResponsiveText - 响应式文本
 * 
 * 根据设备自动调整字体大小
 */
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: 'default' | 'muted' | 'primary' | 'secondary';
}

export const ResponsiveText = memo(function ResponsiveText({
  children,
  className,
  as: Component = 'p',
  variant = 'body',
  color = 'default',
}: ResponsiveTextProps) {
  const device = useDeviceType();

  const variantClasses = {
    display: cn(
      'font-bold',
      device.isMobile && 'text-2xl',
      device.isTablet && 'text-3xl',
      device.isDesktop && 'text-4xl'
    ),
    h1: cn(
      'font-bold',
      device.isMobile && 'text-xl',
      device.isTablet && 'text-2xl',
      device.isDesktop && 'text-3xl'
    ),
    h2: cn(
      'font-semibold',
      device.isMobile && 'text-lg',
      device.isTablet && 'text-xl',
      device.isDesktop && 'text-2xl'
    ),
    h3: cn(
      'font-semibold',
      device.isMobile && 'text-base',
      device.isTablet && 'text-lg',
      device.isDesktop && 'text-xl'
    ),
    body: cn(
      device.isMobile && 'text-sm',
      device.isTablet && 'text-base',
      device.isDesktop && 'text-base'
    ),
    caption: 'text-xs',
  };

  const colorClasses = {
    default: 'text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]',
    muted: 'text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]',
    primary: 'text-[var(--kw-primary-500)]',
    secondary: 'text-[var(--kw-primary-400)]',
  };

  return (
    <Component
      className={cn(
        variantClasses[variant],
        colorClasses[color],
        className
      )}
    >
      {children}
    </Component>
  );
});

/**
 * DeviceOnly - 设备条件渲染
 * 
 * 只在指定设备上渲染内容
 */
interface DeviceOnlyProps {
  children: React.ReactNode;
  mobile?: boolean;
  tablet?: boolean;
  tabletPortrait?: boolean;
  tabletLandscape?: boolean;
  desktop?: boolean;
  fallback?: React.ReactNode;
}

export function DeviceOnly({
  children,
  mobile,
  tablet,
  tabletPortrait,
  tabletLandscape,
  desktop,
  fallback = null,
}: DeviceOnlyProps) {
  const device = useDeviceType();

  const shouldShow =
    (mobile && device.isMobile) ||
    (tablet && device.isTablet) ||
    (tabletPortrait && device.isTabletPortrait) ||
    (tabletLandscape && device.isTabletLandscape) ||
    (desktop && device.isDesktop);

  return shouldShow ? <>{children}</> : <>{fallback}</>;
}

/**
 * ResponsiveSpacing - 响应式间距
 * 
 * 根据设备自动调整间距大小
 */
interface ResponsiveSpacingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'horizontal' | 'vertical';
}

export function ResponsiveSpacing({ 
  size = 'md',
  direction = 'vertical' 
}: ResponsiveSpacingProps) {
  const device = useDeviceType();

  const getSize = () => {
    const baseSizes = {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    };
    
    const base = baseSizes[size];
    
    // 平板使用稍大间距
    if (device.isTablet) return base * 1.25;
    if (device.isDesktop) return base * 1.5;
    return base;
  };

  const sizePx = getSize();

  return (
    <div
      style={{
        width: direction === 'horizontal' ? sizePx : undefined,
        height: direction === 'vertical' ? sizePx : undefined,
      }}
    />
  );
}
