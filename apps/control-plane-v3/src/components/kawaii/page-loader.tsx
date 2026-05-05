/**
 * Page Loader - 统一页面加载组件
 */

'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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
        fullScreen && 'min-h-screen bg-[var(--kw-bg)] dark:bg-[var(--kw-dark-bg)]'
      )}
      style={fullScreen ? undefined : { minHeight }}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2
          className={cn(
            'animate-spin text-[var(--kw-primary-500)]',
            fullScreen ? 'h-10 w-10' : 'h-8 w-8'
          )}
        />
        <p className="text-[var(--kw-text-muted)]">{message}</p>
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
      <Loader2 className="h-5 w-5 animate-spin text-[var(--kw-primary-500)]" />
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
          className="bg-[var(--kw-border)]/50 dark:bg-[var(--kw-dark-border)]/30 h-20 animate-pulse rounded-xl"
        />
      ))}
    </div>
  );
}
