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
