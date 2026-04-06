'use client';

import { useDeviceType } from '@/hooks/use-device-type';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 响应式布局容器
 *
 * 根据设备类型自动调整布局:
 * - Mobile: 单列，无侧边栏，底部导航
 * - Tablet Portrait: 可折叠侧边栏，2列网格，底部导航
 * - Tablet Landscape: 图标侧边栏，3列网格，无底部导航
 * - Desktop: 完整侧边栏，4列网格，无底部导航
 */
export function ResponsiveLayout({ children, className }: ResponsiveLayoutProps) {
  const device = useDeviceType();

  return (
    <div
      className={cn(
        'min-h-screen transition-all duration-300',
        // 移动端: 底部导航空间
        device.isMobile && 'pb-20',
        // 平板竖屏: 图标侧边栏(80px) + 底部导航
        device.isTabletPortrait && 'pb-20 pl-20',
        // 平板横屏: 图标侧边栏(80px)
        device.isTabletLandscape && 'pl-20',
        // 桌面: 完整侧边栏(256px)
        device.isDesktop && 'pl-64',
        className
      )}
      data-device={device.type}
      data-orientation={device.orientation}
    >
      {children}
    </div>
  );
}

/**
 * 响应式网格
 *
 * 自动根据设备类型调整列数
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export function ResponsiveGrid({ children, className, gap = 'md' }: ResponsiveGridProps) {
  const device = useDeviceType();

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  // 动态确定列数
  const getGridCols = () => {
    if (device.isMobile) {
      return 'grid-cols-1';
    }
    if (device.isTabletPortrait) {
      return 'grid-cols-2';
    }
    if (device.isTabletLandscape) {
      return 'grid-cols-3';
    }
    return 'grid-cols-4';
  };

  return <div className={cn('grid', gapClasses[gap], getGridCols(), className)}>{children}</div>;
}

/**
 * 响应式内容区
 *
 * 根据设备调整内边距和最大宽度
 */
interface ResponsiveContentProps {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'compact' | 'wide';
}

export function ResponsiveContent({
  children,
  className,
  size = 'default',
}: ResponsiveContentProps) {
  const device = useDeviceType();

  const sizeClasses = {
    compact: 'max-w-4xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
  };

  return (
    <div
      className={cn(
        'mx-auto w-full transition-all duration-300',
        // 移动端紧凑内边距
        device.isMobile && 'px-4 py-4',
        // 平板适中内边距
        device.isTablet && 'px-6 py-6',
        // 桌面宽松内边距
        device.isDesktop && 'px-8 py-8',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 设备特定渲染
 *
 * 只在特定设备类型上渲染内容
 */
interface DeviceRenderProps {
  children: React.ReactNode;
  mobile?: boolean;
  tablet?: boolean;
  desktop?: boolean;
  tabletPortrait?: boolean;
  tabletLandscape?: boolean;
}

export function DeviceRender({
  children,
  mobile,
  tablet,
  desktop,
  tabletPortrait,
  tabletLandscape,
}: DeviceRenderProps) {
  const device = useDeviceType();

  const shouldRender = () => {
    if (mobile && device.isMobile) {
      return true;
    }
    if (tablet && device.isTablet) {
      return true;
    }
    if (desktop && device.isDesktop) {
      return true;
    }
    if (tabletPortrait && device.isTabletPortrait) {
      return true;
    }
    if (tabletLandscape && device.isTabletLandscape) {
      return true;
    }
    return false;
  };

  if (!shouldRender()) {
    return null;
  }

  return <>{children}</>;
}

/**
 * 响应式文本
 *
 * 根据设备调整字体大小
 */
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4';
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function ResponsiveText({
  children,
  className,
  as: Component = 'p',
  size = 'base',
}: ResponsiveTextProps) {
  const device = useDeviceType();

  // 平板使用稍大的字体
  const scale = device.isTablet ? 1.05 : 1;

  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  return (
    <Component
      className={cn(sizeClasses[size], device.isTablet && size === 'sm' && 'text-base', className)}
      style={{
        fontSize: device.isTablet ? `${scale}em` : undefined,
      }}
    >
      {children}
    </Component>
  );
}
