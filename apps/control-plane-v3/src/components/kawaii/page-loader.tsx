/**
 * Page Loader - 统一页面加载组件
 *
 * Kawaii风格的加载动画
 */

'use client';

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
  const containerClasses = fullScreen
    ? 'min-h-screen bg-gradient-to-br from-pink-50/50 to-purple-50/30 dark:from-[#1A1A2E] dark:to-[#252540]'
    : `min-h-[${minHeight}]`;

  return (
    <div className={`flex items-center justify-center ${containerClasses}`}>
      <div className="flex flex-col items-center gap-4">
        <CuteSpinner size={fullScreen ? 'lg' : 'md'} />
        <p className="animate-pulse text-gray-500 dark:text-gray-400">{message}</p>
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
      {message && <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>}
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
          className="h-20 animate-pulse rounded-2xl bg-pink-100/50 dark:bg-pink-900/20"
        />
      ))}
    </div>
  );
}
