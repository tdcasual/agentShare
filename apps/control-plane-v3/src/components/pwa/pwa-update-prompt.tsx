'use client';

import { usePWA } from '@/hooks/use-pwa';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PWAUpdatePromptProps {
  className?: string;
}

export function PWAUpdatePrompt({ className }: PWAUpdatePromptProps) {
  const { hasUpdate, update, dismissUpdate } = usePWA();

  if (!hasUpdate) {
    return null;
  }

  return (
    <Card
      className={cn(
        'fixed left-4 right-4 top-4 z-50 md:left-auto md:right-4 md:w-96',
        'animate-slide-down border-l-4 border-l-pink-500 shadow-xl',
        className
      )}
    >
      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-900/30">
            <RefreshCw className="h-5 w-5 text-pink-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">新版本可用</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
              更新包含新功能和改进，建议立即更新以获得最佳体验
            </p>
          </div>
          <button
            onClick={dismissUpdate}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-[#3D3D5C]"
            aria-label="忽略"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={dismissUpdate} className="flex-1">
            稍后
          </Button>
          <Button
            size="sm"
            onClick={update}
            className="flex-1"
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            立即更新
          </Button>
        </div>
      </div>
    </Card>
  );
}

// 离线提示
interface PWAOfflineIndicatorProps {
  className?: string;
}

export function PWAOfflineIndicator({ className }: PWAOfflineIndicatorProps) {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-50',
        'bg-amber-500 px-4 py-2 text-center text-white',
        'text-sm font-medium',
        'animate-fade-in',
        className
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        离线模式 - 部分功能可能受限
      </span>
    </div>
  );
}
