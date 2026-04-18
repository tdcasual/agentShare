/**
 * Page Loader - 统一页面加载组件
 *
 * Kawaii风格的加载动画
 */

'use client';

import { cn } from '@/lib/utils';
import { CuteSpinner } from './cute-spinner';

interface PageLoaderProps {
  /** 加载提示文字 */
  message?: string;
  /** 是否全屏 */
  fullScreen?: boolean;
  /** 自定义高度 */
  minHeight?: string;
}

export function PageLoader({
  message = '加载中...',
  fullScreen = false,
  minHeight = '60vh',
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen &&
          'min-h-screen bg-gradient-to-br from-[var(--kw-primary-50)]/50 to-[var(--kw-purple-surface)]/30 dark:from-[var(--kw-dark-bg)] dark:to-[var(--kw-dark-surface)]'
      )}
      style={fullScreen ? undefined : { minHeight }}
    >
      <div className="flex flex-col items-center gap-4">
        <CuteSpinner size={fullScreen ? 'lg' : 'md'} />
        <p className="animate-pulse text-[var(--kw-text-muted)]">{message}</p>
      </div>
    </div>
  );
}

/**
 * 内联加载器（用于卡片/小区域）
 */
export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <CuteSpinner size="sm" />
      {message && <span className="text-sm text-[var(--kw-text-muted)]">{message}</span>}
    </div>
  );
}

/**
 * 骨架屏加载（用于列表）
 */
export function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--kw-primary-100)]/50 dark:bg-[var(--kw-dark-pink-surface)]/20 h-20 animate-pulse rounded-2xl"
        />
      ))}
    </div>
  );
}
