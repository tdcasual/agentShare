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
        'fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50',
        'animate-slide-down shadow-xl border-l-4 border-l-pink-500',
        className
      )}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 dark:text-[#E8E8EC]">
              新版本可用
            </h3>
            <p className="text-sm text-gray-500 dark:text-[#9CA3AF] mt-1">
              更新包含新功能和改进，建议立即更新以获得最佳体验
            </p>
          </div>
          <button
            onClick={dismissUpdate}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3D3D5C] transition-colors"
            aria-label="忽略"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissUpdate}
            className="flex-1"
          >
            稍后
          </Button>
          <Button
            size="sm"
            onClick={update}
            className="flex-1"
            leftIcon={<RefreshCw className="w-4 h-4" />}
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
        'fixed top-0 left-0 right-0 z-50',
        'bg-amber-500 text-white text-center py-2 px-4',
        'text-sm font-medium',
        'animate-fade-in',
        className
      )}
    >
      <span className="inline-flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        离线模式 - 部分功能可能受限
      </span>
    </div>
  );
}
