/**
 * 重构后的 Layout 组件
 *
 * 改进点:
 * 1. 通过 hooks 获取数据，不直接依赖 Runtime
 * 2. 更好的错误处理
 * 3. 更清晰的加载状态
 * 4. 支持测试注入
 */

'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from '@/components/mobile-nav';
import { TabletSidebar } from '@/components/tablet-sidebar';
import { useDeviceType } from '@/hooks/use-device-type';
import { useShellIdentity } from '@/hooks/use-shell-identity';
import { ErrorBoundary } from '@/components/error-boundary';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui-primitives/button';
import type { Identity } from '@/shared/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * 重构后的 Layout 组件
 *
 * 之前的问题:
 * - 直接调用 getRuntime() 和 initializeRuntime()
 * - 直接操作 registry
 * - 难以测试
 *
 * 现在的改进:
 * - 使用 useIdentities hook
 * - 清晰的加载/错误状态
 * - 更好的用户体验
 */
export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const device = useDeviceType();
  const { currentIdentity, onlineIdentities, isLoading, error, refresh } = useShellIdentity();

  // 加载状态
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 错误状态
  if (error) {
    return <ErrorScreen error={error} onRetry={refresh} />;
  }

  return (
    <div className="from-[var(--kw-primary-50)]/50 to-[var(--kw-purple-surface)]/30 min-h-screen bg-gradient-to-br dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
      {/* Desktop Sidebar - lg 及以上显示 */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Tablet Sidebar - md 到 lg 之间显示 */}
      <TabletSidebar />

      {/* Main Content Area */}
      <div
        className={cn(
          'transition-[margin] duration-300 will-change-[margin]',
          // 移动端无侧边栏
          device.isMobile && 'ml-0 pb-20',
          // 平板竖屏：可折叠侧边栏
          device.isTabletPortrait && 'md:ml-14',
          // 平板横屏：图标侧边栏
          device.isTabletLandscape && 'ml-20',
          // 桌面端：根据侧边栏状态
          device.isDesktop && (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')
        )}
      >
        <Header currentIdentity={currentIdentity} onlineIdentities={onlineIdentities} />

        <main
          id="main-content"
          className={cn(
            'touch-pan-y',
            // 移动端更多底部空间给底部导航
            device.isMobile && 'p-4 pb-24',
            // 平板适中内边距
            device.isTablet && 'p-6',
            // 桌面端宽松内边距
            device.isDesktop && 'p-6'
          )}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Mobile Navigation - 仅移动端显示（不包括平板） */}
      {device.isMobile && <MobileNav />}
    </div>
  );
}

/**
 * 统一的加载界面
 *
 * 之前散落在各处的加载 UI 现在统一在这里
 */
function LoadingScreen() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--kw-primary-500)]" />
        <p className="text-[var(--kw-text-muted)]">{t('common.preparingPage')}</p>
      </div>
    </div>
  );
}

/**
 * 错误界面
 *
 * 提供重试机制，提升用户体验
 */
function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--kw-primary-50)] to-[var(--kw-purple-surface)] p-4 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
      <div className="w-full max-w-md rounded-3xl border border-[var(--kw-border)] bg-white p-8 text-center shadow-xl dark:border-[var(--kw-dark-border)] dark:bg-[var(--kw-dark-surface)]">
        <div className="dark:bg-[var(--kw-dark-error-surface)]/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--kw-rose-surface)]">
          <AlertCircle className="h-8 w-8 text-[var(--kw-error)] dark:text-[var(--kw-error)]" />
        </div>

        <h1 className="mb-2 text-xl font-bold text-[var(--kw-text)]">
          {t('common.unexpectedErrorTitle')}
        </h1>

        <p className="mb-6 text-[var(--kw-text-muted)]">
          {error.message || t('common.unexpectedErrorDescription')}
        </p>

        <Button onClick={onRetry}>{t('common.retry')}</Button>
      </div>
    </div>
  );
}

/**
 * 简化版的 Layout，用于测试/Storybook
 *
 * 不依赖 Runtime，接受 props 注入数据
 */
export interface SimpleLayoutProps {
  children: React.ReactNode;
  currentIdentity?: Identity | null;
  onlineIdentities?: Identity[];
  isLoading?: boolean;
}

export function SimpleLayout({
  children,
  currentIdentity = null,
  onlineIdentities = [],
  isLoading = false,
}: SimpleLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const device = useDeviceType();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="from-[var(--kw-primary-50)]/50 to-[var(--kw-purple-surface)]/30 min-h-screen bg-gradient-to-br dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Tablet Sidebar */}
      <TabletSidebar />

      <div
        className={cn(
          'transition-[margin] duration-300',
          device.isMobile && 'ml-0 pb-20',
          device.isTabletPortrait && 'md:ml-14',
          device.isTabletLandscape && 'ml-20',
          device.isDesktop && (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64')
        )}
      >
        <Header currentIdentity={currentIdentity} onlineIdentities={onlineIdentities} />

        <main
          className={cn(
            device.isMobile && 'p-4 pb-24',
            device.isTablet && 'p-6',
            device.isDesktop && 'p-6'
          )}
        >
          {children}
        </main>
      </div>

      {device.isMobile && <MobileNav />}
    </div>
  );
}
